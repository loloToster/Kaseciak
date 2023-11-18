import {
  BaseExtractor,
  ExtractorInfo,
  ExtractorSearchContext,
  Track
} from "discord-player"
import { searchMusics as ytMusicSearchTracks } from "node-youtube-music"

import { isValidUrl } from "./isValidUrl"

const DEF_YT_LINK = "https://www.youtube.com/watch?v="

export class YoutubeMusicExtractor extends BaseExtractor {
  static identifier = "youtube-music" as const

  async validate(query: string): Promise<boolean> {
    return !isValidUrl(query)
  }

  async handle(
    query: string,
    context: ExtractorSearchContext
  ): Promise<ExtractorInfo> {
    const tracks: Track[] = []
    const songs = await ytMusicSearchTracks(query)

    for (const song of songs) {
      tracks.push(
        new Track(this.context.player, {
          author:
            song?.artists?.map((a: { name: string }) => a.name).join(", ") ??
            "",
          duration: song?.duration?.label ?? "",
          requestedBy: context.requestedBy,
          thumbnail: song?.thumbnailUrl ?? "",
          title: song?.title ?? "",
          url: DEF_YT_LINK + song.youtubeId,
          source: "youtube",
          live: false,
          description: "",
          views: -1
        })
      )
    }

    return this.createResponse(null, tracks)
  }
}
