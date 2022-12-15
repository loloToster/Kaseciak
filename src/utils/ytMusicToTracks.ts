import { searchMusics as ytMusicSearchTracks } from "node-youtube-music";
import { Player, Track, PlayerSearchResult } from "discord-player";
import { UserResolvable } from "discord.js";

const DEF_YT_LINK = "https://www.youtube.com/watch?v=";

export default async (
  query: string,
  player: Player,
  requestedBy: UserResolvable
): Promise<PlayerSearchResult> => {
  let results: Track[] = [];
  const songs = await ytMusicSearchTracks(query);

  for (const song of songs) {
    results.push(
      new Track(player, {
        author: song?.artists?.map((a: any) => a.name).join(", ") ?? "",
        duration: song?.duration?.label ?? "",
        // @ts-ignore: Type 'null' is not assignable to type 'User'.
        requestedBy: player.client.users.resolve(requestedBy),
        thumbnail: song?.thumbnailUrl ?? "",
        title: song?.title ?? "",
        url: DEF_YT_LINK + song.youtubeId,
        source: "youtube",
        live: false,
      })
    );
  }

  return { tracks: results, playlist: null };
};
