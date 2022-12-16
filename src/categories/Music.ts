import {
  ApplicationCommandOptionType,
  CommandInteraction,
  EmbedBuilder,
  HexColorString
} from "discord.js"

import {
  Discord,
  SimpleCommandMessage,
  SimpleCommandOption,
  SimpleCommandOptionType,
  SlashOption
} from "discordx"

import { Category } from "@discordx/utilities"
import { PlayerSearchResult } from "discord-player"

import { injectable } from "tsyringe"

import DualCommand from "../utils/DualCommand"
import ytMusicToTracks from "../utils/ytMusicToTracks"
import getColor from "../utils/getColor"

import { Player } from "../modules/player"
import { isValidUrl } from "../utils/isValidUrl"

@Discord()
@injectable()
@Category("Music")
export class Music {
  constructor(private player: Player) {}

  @DualCommand({
    aliases: ["p"],
    description: "Odtwarza lub dodaje do kolejki podaną piosenkę/playlistę"
  })
  async play(
    @SimpleCommandOption({
      name: "query",
      type: SimpleCommandOptionType.String
    })
    @SlashOption({
      name: "query",
      description: "tytuł piosenki",
      type: ApplicationCommandOptionType.String,
      required: false
    })
      query: string | undefined,
      interactionOrMsg: CommandInteraction | SimpleCommandMessage
  ) {
    const replyHandler =
      interactionOrMsg instanceof CommandInteraction
        ? interactionOrMsg
        : interactionOrMsg.message

    if (!replyHandler.guild) return

    const member = replyHandler.guild.members.cache.get(
      interactionOrMsg instanceof CommandInteraction
        ? interactionOrMsg.member?.user.id || "-1"
        : interactionOrMsg.message.author.id
    )

    if (!member) return

    const queue = this.player.createDefaultQueue(replyHandler.guild)

    if (!(await this.player.joinVC(member, replyHandler.guild))) return

    if (!query) {
      if (!queue.playing) await queue.play()
      return
    }

    const splittedQuery = query.split(/ +/g)

    let playNext = false
    let noYTmusic = false

    // process flags:
    for (let i = splittedQuery.length - 1; i >= 0; i--) {
      const arg = splittedQuery[i]
      if (arg.startsWith("-")) {
        const flag = splittedQuery.pop()?.substring(1)
        if (flag == "n") playNext = true
        else if (flag == "nytm") noYTmusic = true
      } else break
    }

    query = splittedQuery.join(" ")

    let searchResult: PlayerSearchResult = { tracks: [], playlist: null }

    if (!isValidUrl(query) && !noYTmusic)
      searchResult = await ytMusicToTracks(query, this.player, member)

    if (!searchResult.tracks?.length)
      searchResult = await this.player.search(query, {
        requestedBy: member
      })

    const playlist = searchResult.playlist

    if (playlist) {
      const tracks = playlist.tracks

      const emb = new EmbedBuilder()
        .setTitle(`Dodaję **${tracks.length}** utworów z **${playlist.title}**`)
        .setURL(playlist.url)
        .setThumbnail(playlist.thumbnail)
        .setDescription(playlist.author.name)

      const color = await getColor(playlist.thumbnail, 500, playlist.id)
      if (color) emb.setColor(color as HexColorString)

      await replyHandler.reply({ embeds: [emb] })

      await queue.play(tracks.shift())
      queue.addTracks(tracks)
    } else if (searchResult?.tracks[0]) {
      const track = searchResult.tracks[0]

      const emb = new EmbedBuilder()
        .setTitle(`Dodaję **${track.title}**`)
        .setURL(track.url)
        .setThumbnail(track.thumbnail)
        .setDescription(track.author)

      const color = await getColor(track.thumbnail, 500, track.id)
      if (color) emb.setColor(color as HexColorString)

      await replyHandler.reply({ embeds: [emb] })

      if (playNext) queue.insert(track)
      else await queue.play(track)
    } else {
      await replyHandler.reply(`❌ | Nie znalazłem piosenki **${query}**!`)
    }
  }
}
