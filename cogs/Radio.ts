import { Collection } from "discord.js"
import { Bot, RawCog } from "discord.js-ext"
import { Player, QueryType, Queue, Track } from "discord-player"
import axios from "axios"
import * as cheerio from "cheerio"

import { CustomMetadata } from "../config/player_setup"
import { Kaseciak } from "../main"

import stations from "./radio_stations.json"

const stationNames = Object.keys(stations.stations)

async function stationToTrack(player: Player, station: string) {
    let query = ""

    for (const source of stations.sources) {
        const { url, selector } = source

        const res = await axios.get(url + (stations.stations as Record<string, any>)[station].source_url[url])

        if (res.status !== 200) {
            console.log(url, "returned status code other then 200:", res.status, res.statusText)
            continue
        }

        const $ = cheerio.load(res.data)
        const title = $(selector).first().text()

        if (title) {
            query = title
            break
        }
    }

    if (!query) return null

    const result = await player.search(query, {
        requestedBy: player.client.user!
    })

    return result?.tracks[0] || null
}

const cog: RawCog = {
    name: "Radio",
    init: b => {
        const bot = b as Kaseciak

        bot.loop(async () => {
            let cache: Record<string, Track | null> = {}
            const queues = bot.player.queues as Collection<string, Queue<CustomMetadata>>

            for (const queue of queues.values()) {
                const radios = queue.metadata?.radios || []

                for (const station of radios) {
                    const track = station in cache ?
                        cache[station] :
                        await stationToTrack(bot.player, station)

                    if (!track) continue

                    const isTrackInQueue = [...queue.previousTracks, ...queue.tracks]
                        .map(t => t.url)
                        .includes(track.url)

                    if (!isTrackInQueue) queue.addTrack(track)
                }
            }

        }, { seconds: 20 }).start()
    },
    validateStations: {
        check: (ctx, args) => {
            const isEveryStationKnown = args.every(arg => {
                const isKnownStation = stationNames.includes(arg)

                if (!isKnownStation)
                    ctx.send("Nie znam stacji " + arg)

                return isKnownStation
            })

            return isEveryStationKnown
        }
    },
    radio: {
        aliases: ["r"],
        description: "Uruchamia dodawanie piosenek z radia",
        check: ["validateStations"],
        command: async (ctx, args) => {
            if (!ctx.message.guild) return

            const player = (ctx.bot as Kaseciak).player
            const queue = player.getQueue<CustomMetadata>(ctx.message.guild.id)

            if (queue?.metadata?.radios) {
                queue.metadata.radios = args
                await ctx.send("Ustawiam słuchane radia na: " + args.join(", "))
            } else {
                await ctx.send("Nie mogę uruchomić radia jeżeli kolejka nie istnieje")
            }
        }
    },
    radioStop: {
        aliases: ["rs"],
        description: "Zatrzymuje dodawanie piosenek z radia",
        command: async (ctx, args) => {
            if (!ctx.message.guild) return

            const player = (ctx.bot as Kaseciak).player
            const queue = player.getQueue<CustomMetadata>(ctx.message.guild.id)

            if (queue?.metadata?.radios)
                queue.metadata.radios = []

            await ctx.send("Usuwam wszystkie słuchane radia")
        }
    }
}

export function setup(bot: Bot) {
    bot.addCog(cog)
}
