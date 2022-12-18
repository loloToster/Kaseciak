import {
  ApplicationCommandOptionType,
  CommandInteraction,
  EmbedBuilder,
  HexColorString,
  TextChannel
} from "discord.js"

import {
  Discord,
  Guard,
  SimpleCommandMessage,
  SimpleCommandOption,
  SimpleCommandOptionType,
  SlashOption
} from "discordx"

import { Category } from "@discordx/utilities"
import { Pagination } from "@discordx/pagination"
import { PlayerSearchResult } from "discord-player"

import { injectable } from "tsyringe"

// @ts-ignore: Could not find a declaration file for module 'lyrics-finder'
import getLyrics from "lyrics-finder"

import { isValidUrl } from "../utils/isValidUrl"
import getColor from "../utils/getColor"
import DualCommand, { getMember, getReplyHandler } from "../utils/DualCommand"
import ytMusicToTracks from "../utils/ytMusicToTracks"
import MusicController from "../utils/MusicController"

import isGuild from "../guards/isGuild"
import onVoiceChannel from "../guards/onVoiceChannel"
import { CustomMetadata, Player } from "../modules/player"

@Discord()
@injectable()
@Category("Music")
export class Music {
  constructor(private player: Player) {}

  @DualCommand({
    aliases: ["p"],
    description: "Plays or adds a song/playlist to the queue"
  })
  @Guard(onVoiceChannel)
  async play(
    @SimpleCommandOption({
      name: "query",
      type: SimpleCommandOptionType.String
    })
    @SlashOption({
      name: "query",
      description: "song title",
      type: ApplicationCommandOptionType.String,
      required: false
    })
      query: string | undefined,
      interactionOrMsg: CommandInteraction | SimpleCommandMessage
  ) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return
    const member = getMember(interactionOrMsg)
    if (!member) return

    const queue = this.player.createDefaultQueue(replyHandler.guild)

    if (!(await this.player.joinVC(member, replyHandler.guild))) return

    if (!query) {
      if (!queue.playing) await queue.play()
      await replyHandler.reply("Playing...")
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
        .setTitle(
          `Adding **${tracks.length}** songs from **${playlist.title}**`
        )
        .setURL(playlist.url)
        // @ts-ignore
        .setThumbnail(playlist.thumbnail.url || playlist.thumbnail)
        .setDescription(playlist.author.name)

      const color = await getColor(playlist.thumbnail, 500, playlist.id)
      if (color) emb.setColor(color as HexColorString)

      await replyHandler.reply({ embeds: [emb] })

      await queue.play(tracks.shift())
      queue.addTracks(tracks)
    } else if (searchResult?.tracks[0]) {
      const track = searchResult.tracks[0]

      const emb = new EmbedBuilder()
        .setTitle(`Adding **${track.title}**`)
        .setURL(track.url)
        .setThumbnail(track.thumbnail)
        .setDescription(track.author)

      const color = await getColor(track.thumbnail, 500, track.id)
      if (color) emb.setColor(color as HexColorString)

      await replyHandler.reply({ embeds: [emb] })

      if (playNext) queue.insert(track)
      else await queue.play(track)
    } else {
      await replyHandler.reply(`❌ | Could not find **${query}**!`)
    }
  }

  @DualCommand({
    aliases: ["s"],
    description: "Skips current or multiple songs"
  })
  @Guard(onVoiceChannel)
  async skip(
    @SimpleCommandOption({
      name: "amount",
      type: SimpleCommandOptionType.Number
    })
    @SlashOption({
      name: "amount",
      description: "amount of songs to skip",
      type: ApplicationCommandOptionType.Integer,
      required: false
    })
      amount: number | undefined,
      interactionOrMsg: CommandInteraction | SimpleCommandMessage
  ) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    const queue = this.player.getQueue(replyHandler.guild)

    if (!queue || !queue.playing)
      return await replyHandler.reply("Could not skip")

    if (amount !== undefined && amount > 1) {
      if (amount > queue.tracks.length) amount = queue.tracks.length
      queue.skipTo(amount - 1)
      await replyHandler.reply(`Skipping **${amount}** songs`)
      return
    }

    const success = queue.skip()

    await replyHandler.reply(
      success ? `Skipping **${queue.current.title}**` : "Something went wrong"
    )
  }

  @DualCommand({
    aliases: ["prev", "previous"],
    description: "Rewinds to the previous song"
  })
  @Guard(onVoiceChannel)
  async back(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    const queue = this.player.getQueue(replyHandler.guild)

    await queue?.back()

    await replyHandler.reply("Rewinding")
  }

  @DualCommand({ description: "Pauses the song" })
  @Guard(onVoiceChannel)
  async pause(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    const queue = this.player.getQueue(replyHandler.guild)

    queue?.setPaused(true)

    await replyHandler.reply("Pausing")
  }

  @DualCommand({ description: "Resumes the song" })
  @Guard(onVoiceChannel)
  async resume(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    const queue = this.player.getQueue(replyHandler.guild)

    queue?.setPaused(false)

    await replyHandler.reply("Resuming")
  }

  @DualCommand({ description: "Rewinds the song to a specific moment" })
  @Guard(onVoiceChannel)
  async seek(
    @SimpleCommandOption({
      name: "seconds",
      type: SimpleCommandOptionType.Number
    })
    @SlashOption({
      name: "seconds",
      description: "what second the song should be rewound to",
      type: ApplicationCommandOptionType.Integer,
      required: true
    })
      seconds: number | undefined,
      interactionOrMsg: CommandInteraction | SimpleCommandMessage
  ) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    const queue = this.player.getQueue(replyHandler.guild)

    if (typeof seconds !== "number")
      return await replyHandler.reply("Provide seconds")

    const secsInMs = seconds * 1000

    if (queue && (await queue.seek(secsInMs))) {
      await replyHandler.reply(`Rewinding to ${seconds} second`)
    } else {
      await replyHandler.reply("Could not rewind")
    }
  }

  @DualCommand({ description: "Clears the queue" })
  @Guard(onVoiceChannel)
  async clear(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    const queue = this.player.getQueue(replyHandler.guild)

    queue?.clear()

    await replyHandler.reply("Queue cleared 🗑️")
  }

  @DualCommand({ description: "Shuffles the queue" })
  @Guard(onVoiceChannel)
  async shuffle(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    const queue = this.player.getQueue(replyHandler.guild)

    queue?.shuffle()

    await replyHandler.reply("Queue shuffled 🔀")
  }

  @DualCommand({ description: "Stops the bot and deletes the queue" })
  @Guard(onVoiceChannel)
  async stop(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    const queue = this.player.getQueue(replyHandler.guild)

    queue?.destroy(true)

    await replyHandler.reply("Stopped and deleted the queue")
  }

  @DualCommand({
    aliases: ["q"],
    description: "Show the queue"
  })
  @Guard(isGuild)
  async queue(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    const queue = this.player.getQueue(replyHandler.guild)

    if (!queue) return await replyHandler.reply("Queue does not exist")

    const pages: EmbedBuilder[] = []

    const chunkSize = 10
    const numberOfChunks = Math.ceil(queue.tracks.length / chunkSize)

    for (
      let i = 0, chunkNumber = 0;
      i < queue.tracks.length;
      i += chunkSize, chunkNumber++
    ) {
      const chunk = queue.tracks.slice(i, i + chunkSize)
      pages.push(
        new EmbedBuilder()
          .setDescription(
            chunk
              .map(
                (track, j) =>
                  `${chunkNumber * chunkSize + j + 1}. ${track.title} - ${
                    track.author
                  } \`${track.duration}\``
              )
              .join("\n")
          )
          .setFooter({ text: `Page ${chunkNumber + 1}/${numberOfChunks}` })
      )
    }

    if (!pages.length) return await replyHandler.reply("Queue is empty")

    await new Pagination(
      replyHandler,
      pages.map(p => ({ embeds: [p] }))
    ).send()
  }

  @DualCommand({
    aliases: ["l"],
    description: "Searches for the lyrics of a song"
  })
  async lyrics(
    @SimpleCommandOption({
      name: "query",
      type: SimpleCommandOptionType.String
    })
    @SlashOption({
      name: "query",
      description: "song title",
      type: ApplicationCommandOptionType.String,
      required: false
    })
      query: string | undefined,
      interactionOrMsg: CommandInteraction | SimpleCommandMessage
  ) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!query) {
      if (!replyHandler.guild) {
        return await replyHandler.reply("Provide song title")
      }

      const queue = this.player.getQueue(replyHandler.guild)

      if (!queue?.current) {
        return await replyHandler.reply("Nothing is being played right now")
      }

      query = `${queue.current.title} ${queue.current.author}`
    }

    if (interactionOrMsg instanceof CommandInteraction) {
      await interactionOrMsg.deferReply()
    } else {
      await replyHandler.reply("Searching: " + query)
    }

    const lyrics: string | undefined = await getLyrics(query)

    const msgPayload = lyrics
      ? {
        embeds: [
          new EmbedBuilder()
            .setTitle("Results for: " + query)
            .setDescription(lyrics)
        ]
      }
      : "Could not find the lyrics"

    if (interactionOrMsg instanceof CommandInteraction) {
      await interactionOrMsg.editReply(msgPayload)
    } else {
      await replyHandler.reply(msgPayload)
    }
  }

  @DualCommand({
    name: "player",
    description: "Starts or stops the music controller"
  })
  @Guard(isGuild)
  async musicControllerHandler(
    interactionOrMsg: CommandInteraction | SimpleCommandMessage
  ) {
    const replyHandler = getReplyHandler(interactionOrMsg)

    if (!replyHandler.guild || !(replyHandler.channel instanceof TextChannel))
      return

    const queue = this.player.getQueue(replyHandler.guild)

    if (!queue) {
      return await replyHandler.reply("Queue does not exist")
    }

    const controllerExists = Boolean(queue.metadata?.musiccontroller)

    if (interactionOrMsg instanceof CommandInteraction) {
      await interactionOrMsg.reply(
        controllerExists ? "Closing the controller" : "Opening a controller"
      )
    }

    if (controllerExists) {
      await queue.metadata?.musiccontroller?.delete()
    }

    const newController = controllerExists
      ? undefined
      : await new MusicController<CustomMetadata>({
        player: this.player,
        channel: replyHandler.channel
      }).send()

    queue.metadata = {
      radios: queue.metadata?.radios ?? [],
      musiccontroller: newController
    }
  }
}
