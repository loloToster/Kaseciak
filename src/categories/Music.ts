import {
  ApplicationCommandOptionType,
  CommandInteraction,
  EmbedBuilder,
  HexColorString,
  TextChannel,
  User
} from "discord.js"

import {
  Discord,
  Guard,
  SimpleCommandMessage,
  SimpleCommandOption,
  SimpleCommandOptionType,
  SlashChoice,
  SlashOption
} from "discordx"

import { Category } from "@discordx/utilities"
import { Pagination } from "@discordx/pagination"
import { lyricsExtractor } from "@discord-player/extractor"

import { injectable } from "tsyringe"

import getColor from "../utils/getColor"
import DualCommand, {
  getMember,
  getReplyHandler,
  getUser
} from "../utils/DualCommand"
import MusicController from "../utils/MusicController"
import { YoutubeMusicExtractor } from "../utils/YoutubeMusicExtractor"

import isGuild from "../guards/isGuild"
import onVoiceChannel from "../guards/onVoiceChannel"

import { CustomMetadata, Player } from "../modules/player"
import { Database } from "../modules/database"

const lyricsClient = lyricsExtractor()

const supportedQuerySearchEngines = {
  "youtube music": `ext:${YoutubeMusicExtractor.identifier}`,
  youtube: "com.discord-player.youtubeextractor",
  spotify: "com.discord-player.spotifyextractor"
} as const

type SupportedQuerySearchEngine = keyof typeof supportedQuerySearchEngines

const supportedQuerySearchEnginesNames = Object.keys(
  supportedQuerySearchEngines
)

@Discord()
@injectable()
@Category("Music")
export class Music {
  constructor(private player: Player, private db: Database) {}

  private async search(user: User, query: string) {
    const users = await this.db.getData("/users")
    const engine: SupportedQuerySearchEngine = users[user.id]?.engine

    if (engine) {
      const result = await this.player.search(query, {
        requestedBy: user,
        blockExtractors: this.player.extractors.store
          .array()
          .map(e => e.identifier)
          .filter(id => id !== supportedQuerySearchEngines[engine])
      })

      if (result.hasTracks() || result.hasPlaylist()) return result
    }

    return await this.player.search(query, {
      requestedBy: user
    })
  }

  @DualCommand({
    description: "Sets or shows engine to use when querying by non-url value"
  })
  async engine(
    @SimpleCommandOption({
      name: "engine",
      type: SimpleCommandOptionType.String
    })
    @SlashChoice(...supportedQuerySearchEnginesNames)
    @SlashOption({
      name: "engine",
      description: "name of the supported engine",
      type: ApplicationCommandOptionType.String,
      required: false
    })
      engine: SupportedQuerySearchEngine | undefined,
      interactionOrMsg: CommandInteraction | SimpleCommandMessage
  ) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    const user = getUser(interactionOrMsg)

    if (!engine) {
      const users = await this.db.getData("/users")
      const engine: string | undefined = users[user.id]?.engine

      return await replyHandler.reply(
        engine
          ? `Your engine is set to: ${engine}`
          : "You are using default engine"
      )
    }

    if (!supportedQuerySearchEnginesNames.includes(engine)) {
      return await replyHandler.reply(`I don't now engine with name: ${engine}`)
    }

    await this.db.push("/users", {
      [user.id]: { engine }
    })

    await replyHandler.reply(`Successfully set engine to: ${engine}`)
  }

  @DualCommand({
    aliases: ["p"],
    description: "Plays or adds a song/playlist to the queue",
    argSplitter(command) {
      return [command.argString]
    }
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
      interactionOrMsg: CommandInteraction | SimpleCommandMessage,
      playNext = false
  ) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return
    const member = getMember(interactionOrMsg)
    if (!member) return

    const queue = this.player.createDefaultQueue(replyHandler.guild)

    if (!(await this.player.joinVC(member, replyHandler.guild))) return

    if (!query) {
      if (!queue.node.isPlaying()) await queue.node.play()
      await replyHandler.reply("Playing...")
      return
    }

    if (interactionOrMsg instanceof CommandInteraction) {
      await interactionOrMsg.deferReply()
    }

    let emb: EmbedBuilder | null = new EmbedBuilder()

    const searchResult = await this.search(getUser(interactionOrMsg), query)

    const playlist = searchResult.playlist

    if (playlist) {
      const tracks = playlist.tracks

      emb = new EmbedBuilder()
        .setTitle(
          `Adding **${tracks.length}** songs from **${playlist.title}**`
        )
        .setURL(playlist.url)
        // @ts-ignore
        .setThumbnail(playlist.thumbnail.url || playlist.thumbnail)
        .setDescription(playlist.author.name)

      const color = await getColor(playlist.thumbnail, 500, playlist.id)
      if (color) emb.setColor(color as HexColorString)

      if (playNext) {
        tracks.reverse().forEach(t => queue.insertTrack(t))
      } else {
        const track = tracks.shift()
        if (track) await queue.play(track)
        queue.addTrack(tracks)
      }
    } else if (searchResult?.tracks[0]) {
      const track = searchResult.tracks[0]

      emb = new EmbedBuilder()
        .setTitle(`Adding **${track.title}**`)
        .setURL(track.url)
        .setThumbnail(track.thumbnail)
        .setDescription(track.author)

      const color = await getColor(track.thumbnail, 500, track.id)
      if (color) emb.setColor(color as HexColorString)

      if (playNext) queue.insertTrack(track)
      else await queue.play(track)
    } else {
      emb = null
    }

    const msgPayload = emb
      ? { embeds: [emb] }
      : `❌ | Could not find **${query}**!`

    if (interactionOrMsg instanceof CommandInteraction) {
      await interactionOrMsg.editReply(msgPayload)
    } else {
      await replyHandler.reply(msgPayload)
    }

    if (!queue.isPlaying() && !queue.node.isPaused()) await queue.node.play()
  }

  @DualCommand({
    aliases: ["pn"],
    description: "Plays or adds a song/playlist as next to the queue",
    argSplitter(command) {
      return [command.argString]
    }
  })
  @Guard(onVoiceChannel)
  async playnext(
    @SimpleCommandOption({
      name: "query",
      type: SimpleCommandOptionType.String
    })
    @SlashOption({
      name: "query",
      description: "song title",
      type: ApplicationCommandOptionType.String,
      required: true
    })
      query: string | undefined,
      interactionOrMsg: CommandInteraction | SimpleCommandMessage
  ) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!query) return await replyHandler.reply("Provide query")
    return await this.play(query, interactionOrMsg, true)
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

    if (!queue || !queue.isPlaying())
      return await replyHandler.reply("Could not skip")

    if (amount !== undefined && amount > 1) {
      if (amount > queue.tracks.size) amount = queue.tracks.size
      queue.node.skipTo(amount - 1)
      await replyHandler.reply(`Skipping **${amount}** songs`)
      return
    }

    const success = queue.node.skip()

    await replyHandler.reply(
      success
        ? `Skipping **${queue.currentTrack?.title}**`
        : "Something went wrong"
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

    await queue?.history.back()

    await replyHandler.reply("Rewinding")
  }

  @DualCommand({ description: "Pauses the song" })
  @Guard(onVoiceChannel)
  async pause(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    const queue = this.player.getQueue(replyHandler.guild)

    queue?.node.pause()

    await replyHandler.reply("Pausing")
  }

  @DualCommand({ description: "Resumes the song" })
  @Guard(onVoiceChannel)
  async resume(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    const queue = this.player.getQueue(replyHandler.guild)

    queue?.node.resume()

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

    if (queue && (await queue.node.seek(secsInMs))) {
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

    queue?.tracks.shuffle()

    await replyHandler.reply("Queue shuffled 🔀")
  }

  @DualCommand({ description: "Stops the bot and deletes the queue" })
  @Guard(onVoiceChannel)
  async stop(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    const queue = this.player.getQueue(replyHandler.guild)

    queue?.delete()

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
    const numberOfChunks = Math.ceil(queue.tracks.size / chunkSize)

    for (
      let i = 0, chunkNumber = 0;
      i < queue.tracks.size;
      i += chunkSize, chunkNumber++
    ) {
      const chunk = queue.tracks.toArray().slice(i, i + chunkSize)

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
    description: "Searches for the lyrics of a song",
    argSplitter(command) {
      return [command.argString]
    }
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

      if (!queue?.currentTrack) {
        return await replyHandler.reply("Nothing is being played right now")
      }

      query = `${queue.currentTrack.title} ${queue.currentTrack.author}`
    }

    if (interactionOrMsg instanceof CommandInteraction) {
      await interactionOrMsg.deferReply()
    } else {
      await replyHandler.reply("Searching: " + query)
    }

    const lyricsData = await lyricsClient.search(query)

    const msgPayload = lyricsData
      ? {
        embeds: [
          new EmbedBuilder()
            .setTitle("Results for: " + query)
            .setDescription(lyricsData.lyrics)
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
