import axios from "axios"
import * as cheerio from "cheerio"
import { injectable } from "tsyringe"

import {
  ApplicationCommandOptionType,
  Collection,
  CommandInteraction,
  UserResolvable
} from "discord.js"
import {
  Discord,
  Guard,
  Once,
  SimpleCommandMessage,
  SimpleCommandOption,
  SimpleCommandOptionType,
  SlashChoice,
  SlashOption
} from "discordx"
import { Category } from "@discordx/utilities"
import { Track, GuildQueue } from "discord-player"

import DualCommand, { getMember, getReplyHandler } from "../utils/DualCommand"

import onVoiceChannel from "../guards/onVoiceChannel"
import { CustomMetadata, Player } from "../modules/player"

import {
  stations,
  sources as radioDataSources,
  StationName
} from "../utils/radioStations"

const stationNames = Object.keys(stations)

@Discord()
@injectable()
@Category("Radio")
export class Radio {
  constructor(private player: Player) {}

  private async stationToTrack(author: UserResolvable, station: StationName) {
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

    const result = await this.player.search(query, {
      requestedBy: author
    })

    return result?.tracks[0] || null
  }

  @Once({ event: "ready" })
  onReady() {
    setInterval(async () => {
      const cache: Record<string, Track | null> = {}
      const queues = this.player.queues.cache as Collection<
        string,
        GuildQueue<CustomMetadata>
      >

      for (const queue of queues.values()) {
        const radios = queue.metadata?.radios || []

        for (const station of radios) {
          let track: Track | null = null

          if (station.name in cache) {
            track = cache[station.name]
            if (track) {
              track = new Track(this.player, {
                ...track,
                queryType: track.queryType ?? undefined,
                requestedBy: station.author
              })
            }
          } else {
            track = await this.stationToTrack(station.author, station.name)
          }

          if (!track) continue

          const allTracks = [
            queue.currentTrack,
            ...queue.history.tracks.toArray(),
            ...queue.tracks.toArray()
          ]

          const isTrackInQueue = allTracks.map(t => t?.url).includes(track.url)

          if (!isTrackInQueue) queue.node.play(track)
        }
      }
    }, 20 * 1000)
  }

  @DualCommand({
    aliases: ["r"],
    description: "Starts adding songs from the radio or adds a radio station"
  })
  @Guard(onVoiceChannel)
  async radio(
    @SimpleCommandOption({
      name: "station",
      type: SimpleCommandOptionType.String
    })
    @SlashChoice(...stationNames)
    @SlashOption({
      name: "station",
      description: "name of the station to add to the queue",
      type: ApplicationCommandOptionType.String,
      required: true
    })
      station: StationName,
      interactionOrMsg: CommandInteraction | SimpleCommandMessage
  ) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return
    const member = getMember(interactionOrMsg)
    if (!member) return

    if (!stationNames.includes(station))
      return await replyHandler.reply(
        "I don't know station with a name: " + station
      )

    const queue = this.player.createDefaultQueue(replyHandler.guild)

    queue.metadata?.radios.push({
      author: member.user,
      name: station
    })

    await this.player.joinVC(member, replyHandler.guild)

    await replyHandler.reply("Adding station: " + station)
  }

  @DualCommand({
    name: "radio-stop",
    aliases: ["rs"],
    description: "Removes all radios from the queue"
  })
  @Guard(onVoiceChannel)
  async radioStop(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    const queue = this.player.getQueue(replyHandler.guild)

    if (queue?.metadata?.radios) queue.metadata.radios = []

    await replyHandler.reply("Removing all radios from the queue")
  }
}
