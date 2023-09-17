import { inject, singleton } from "tsyringe"
import { Player as DiscordPlayer, PlayerSearchResult } from "discord-player"
import { Client } from "discordx"
import { GuildMember, GuildResolvable, User } from "discord.js"

import MusicController from "../utils/MusicController"
import { StationName } from "../utils/radioStations"
import ytMusicToTracks from "../utils/ytMusicToTracks"
import { isValidUrl } from "../utils/isValidUrl"

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
    super(client, { ytdlOptions: { quality: "lowestaudio" } })

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
    return this.nodes.create<CustomMetadata>(guild, {
      metadata: { radios: [] },
      leaveOnEnd: false,
      leaveOnStop: false,
      leaveOnEmptyCooldown: 5 * 60 * 1000,
      bufferingTimeout: 500
    })
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

  private async searchBySpecificPlatform(
    query: string,
    platform: SearchPlatform,
    options: PlatformSearchOptions
  ) {
    switch (platform) {
      case "yt": {
        const res = await this.search(query, options)

        return {
          tracks: res.tracks,
          playlist: res.playlist ?? null
        }
      }

      case "ytm": {
        return await ytMusicToTracks(query, this, options.requestedBy)
      }
    }
  }

  async platformSearch(query: string, options: PlatformSearchOptions) {
    let searchResult: PlayerSearchResult = { tracks: [], playlist: null }

    const platform = options?.platform ?? this.SEARCH_PLATFORM

    if (platform !== DEFAULT_SEARCH_PLATFORM && !isValidUrl(query)) {
      searchResult = await this.searchBySpecificPlatform(
        query,
        platform,
        options
      )
    }

    if (!searchResult.tracks.length) {
      searchResult = await this.searchBySpecificPlatform(
        query,
        DEFAULT_SEARCH_PLATFORM,
        options
      )
    }

    return searchResult
  }
}
