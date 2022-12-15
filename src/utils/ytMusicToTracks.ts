import { searchMusics as ytMusicSearchTracks } from "node-youtube-music"
import { Player, Track, PlayerSearchResult } from "discord-player"
import { User, UserResolvable } from "discord.js"

const DEF_YT_LINK = "https://www.youtube.com/watch?v="

export default async (
  query: string,
  player: Player,
  requestedBy: UserResolvable
): Promise<PlayerSearchResult> => {
  const results: Track[] = []
  const songs = await ytMusicSearchTracks(query)

  for (const song of songs) {
    results.push(
      new Track(player, {
        author:
          song?.artists?.map((a: { name: string }) => a.name).join(", ") ?? "",
        duration: song?.duration?.label ?? "",
        requestedBy: player.client.users.resolve(requestedBy) as User,
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

  return { tracks: results, playlist: null }
}
