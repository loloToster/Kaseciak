import { inject, singleton } from "tsyringe"
import { Player as DiscordPlayer } from "discord-player"
import { Client } from "discordx"
import { GuildMember, GuildResolvable, User } from "discord.js"

import MusicController from "../utils/MusicController"
import { StationName } from "../utils/radioStations"
import { YoutubeMusicExtractor } from "../utils/YoutubeMusicExtractor"

export interface CustomMetadata {
  radios: Array<{
    author: User
    name: StationName
  }>
  musiccontroller?: MusicController<CustomMetadata>
}

export const SEARCH_PLATFORMS = ["yt", "ytm"] as const
export const DEFAULT_SEARCH_PLATFORM = SEARCH_PLATFORMS[0]
export type SearchPlatform = typeof SEARCH_PLATFORMS[number]

export interface PlatformSearchOptions {
  platform?: SearchPlatform
  requestedBy: User
}

@singleton()
export class Player extends DiscordPlayer {
  SEARCH_PLATFORM: SearchPlatform

  constructor(@inject("client") client: Client) {
    process.env.DP_FORCE_YTDL_MOD = "@distube/ytdl-core"
    // custom env variable made with patch-package used in @discord-player/opus
    process.env.OPUS_PACKAGE = "@evan/opus"

    super(client, { ytdlOptions: { quality: "lowestaudio" } })

    this.on("error", err => {
      console.error(err)
    })

    this.events.on("error", (q, err) => {
      console.error(err)
    })

    this.events.on("playerError", (q, err) => {
      console.error(err)
    })

    this.extractors.register(YoutubeMusicExtractor, {})
    this.extractors.loadDefault()

    if (process.env.SEARCH_PLATFORM) {
      if (SEARCH_PLATFORMS.includes(process.env.SEARCH_PLATFORM as any)) {
        this.SEARCH_PLATFORM = process.env.SEARCH_PLATFORM as SearchPlatform
      } else {
        throw new Error(
          `Unknown search platform: ${process.env.SEARCH_PLATFORM}`
        )
      }
    } else {
      this.SEARCH_PLATFORM = DEFAULT_SEARCH_PLATFORM
    }
  }

  getQueue<T = CustomMetadata>(guild: GuildResolvable) {
    return this.nodes.get<T>(guild)
  }

  createDefaultQueue(guild: GuildResolvable) {
    const queue = this.nodes.create<CustomMetadata>(guild, {
      metadata: { radios: [] },
      leaveOnEnd: false,
      leaveOnStop: false,
      leaveOnEmptyCooldown: 5 * 60 * 1000,
      bufferingTimeout: 500
    })

    return queue
  }

  async joinVC(
    member: GuildMember | null | undefined,
    guild: GuildResolvable | undefined
  ) {
    if (!member || !guild || !member.voice.channelId) return false

    const queue = this.getQueue(guild)
    if (!queue) return false

    try {
      if (!queue.connection) await queue.connect(member.voice.channelId)
      return true
    } catch {
      queue.delete()
    }

    return false
  }
}
