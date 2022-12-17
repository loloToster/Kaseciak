import axios from "axios"
import * as cheerio from "cheerio"
import { injectable } from "tsyringe"

import {
  ApplicationCommandOptionType,
  Collection,
  CommandInteraction
} from "discord.js"
import {
  Discord,
  Once,
  SimpleCommandMessage,
  SimpleCommandOption,
  SimpleCommandOptionType,
  SlashChoice,
  SlashOption
} from "discordx"
import { Category } from "@discordx/utilities"
import { Track, Queue } from "discord-player"

import { CustomMetadata, Player } from "../modules/player"
import DualCommand, { getReplyHandler } from "../utils/DualCommand"

import { stations, sources as radioDataSources } from "../radio_stations.json"

const stationNames = Object.keys(stations)
type StationName = keyof typeof stations

async function stationToTrack(player: Player, station: StationName) {
  let query = ""

  for (const source of radioDataSources) {
    const { url, selector } = source

    const res = await axios.get(
      url + (stations[station].source_url as Record<string, any>)[url]
    )

    if (res.status !== 200) {
      console.warn(
        url,
        "returned status code other then 200:",
        res.status,
        res.statusText
      )
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

@Discord()
@injectable()
@Category("Radio")
export class Radio {
  constructor(private player: Player) {}

  @Once({ event: "ready" })
  onReady() {
    setInterval(async () => {
      const cache: Record<string, Track | null> = {}
      const queues = this.player.queues as Collection<
        string,
        Queue<CustomMetadata>
      >

      for (const queue of queues.values()) {
        const radios = queue.metadata?.radios || []

        for (const station of radios as StationName[]) {
          const track =
            station in cache
              ? cache[station]
              : await stationToTrack(this.player, station)

          if (!track) continue

          const isTrackInQueue = [...queue.previousTracks, ...queue.tracks]
            .map(t => t.url)
            .includes(track.url)

          if (!isTrackInQueue) queue.addTrack(track)
        }
      }
    }, 20 * 1000)
  }

  @DualCommand({
    aliases: ["r"],
    description: "Uruchamia dodawanie piosenek z radia"
  })
  async radio(
    @SimpleCommandOption({
      name: "station",
      type: SimpleCommandOptionType.String
    })
    @SlashChoice(...stationNames)
    @SlashOption({
      name: "station",
      description: "stacja do dodania",
      type: ApplicationCommandOptionType.String,
      required: true
    })
      station: string,
      interactionOrMsg: CommandInteraction | SimpleCommandMessage
  ) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    if (!stationNames.includes(station))
      return await replyHandler.reply("Nie znam stacji: " + station)

    const queue = this.player.createDefaultQueue(replyHandler.guild)
    queue.metadata?.radios.push(station)

    await replyHandler.reply("Dodaję stacje: " + station)
  }

  @DualCommand({
    name: "radio-stop",
    aliases: ["rs"],
    description: "Zatrzymuje dodawanie piosenek z radia"
  })
  async radioStop(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    const queue = this.player.getQueue(replyHandler.guild)

    if (queue?.metadata?.radios) queue.metadata.radios = []

    await replyHandler.reply("Usuwam wszystkie słuchane radia")
  }
}
