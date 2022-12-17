import {
  ApplicationCommandOptionType,
  CommandInteraction,
  EmbedBuilder,
  HexColorString,
  TextChannel
} from "discord.js"

import {
  Discord,
  SimpleCommandMessage,
  SimpleCommandOption,
  SimpleCommandOptionType,
  SlashOption
} from "discordx"

import { Category } from "@discordx/utilities"
import { Pagination, PaginationType } from "@discordx/pagination"
import { PlayerSearchResult } from "discord-player"

import { injectable } from "tsyringe"

// @ts-ignore: Could not find a declaration file for module 'lyrics-finder'
import getLyrics from "lyrics-finder"

import { isValidUrl } from "../utils/isValidUrl"
import getColor from "../utils/getColor"
import DualCommand, { getMember, getReplyHandler } from "../utils/DualCommand"
import ytMusicToTracks from "../utils/ytMusicToTracks"
import MusicController from "../utils/MusicController"

import { CustomMetadata, Player } from "../modules/player"

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
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return
    const member = getMember(interactionOrMsg)
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

  @DualCommand({
    aliases: ["s"],
    description: "Skipuje obecną lub kilka piosenek"
  })
  async skip(
    @SimpleCommandOption({
      name: "ilosc",
      type: SimpleCommandOptionType.Number
    })
    @SlashOption({
      name: "ilosc",
      description: "ilość piosenek do skipnięcia",
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
      return replyHandler.reply("Nie ma czego skipnąć")

    if (amount !== undefined && amount > 1) {
      if (amount > queue.tracks.length) amount = queue.tracks.length
      queue.skipTo(amount - 1)
      await replyHandler.reply(`Skipuje **${amount}** piosenek`)
      return
    }

    const success = queue.skip()

    await replyHandler.reply(
      success ? `Skipuje **${queue.current.title}**` : "Coś się pokićkało"
    )
  }

  @DualCommand({
    aliases: ["prev", "previous"],
    description: "Cofa do poprzedniej piosenki"
  })
  async back(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    const queue = this.player.getQueue(replyHandler.guild)

    await queue?.back()

    await replyHandler.reply("Cofam")
  }

  @DualCommand({ description: "Pauzuje piosenkę" })
  async pause(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    const queue = this.player.getQueue(replyHandler.guild)

    queue?.setPaused(true)

    await replyHandler.reply("Pauzuję")
  }

  @DualCommand({ description: "Kontunuuje odtwarzanie piosenki" })
  async resume(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    const queue = this.player.getQueue(replyHandler.guild)

    queue?.setPaused(false)

    await replyHandler.reply("Wznawiam")
  }

  @DualCommand({ description: "Przewija piosenkę do konkretnego momentu" })
  async seek(
    @SimpleCommandOption({
      name: "sekundy",
      type: SimpleCommandOptionType.Number
    })
    @SlashOption({
      name: "sekundy",
      description: "do której sekundy ma być przewinięta piosenka",
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
      return await replyHandler.reply("Podaj sekundy")

    const secsInMs = seconds * 1000

    if (queue && (await queue.seek(secsInMs))) {
      await replyHandler.reply(`Przewijam do ${seconds} sekund`)
    } else {
      await replyHandler.reply("Nie zdołałem przewinąć")
    }
  }

  @DualCommand({ description: "Czyści kolejkę" })
  async clear(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    const queue = this.player.getQueue(replyHandler.guild)

    queue?.clear()

    await replyHandler.reply("Kolejka wyczyszczona 🗑️")
  }

  @DualCommand({ description: "Tasuje kolejkę" })
  async shuffle(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    const queue = this.player.getQueue(replyHandler.guild)

    queue?.shuffle()

    await replyHandler.reply("Zshufflowałem piosenki 🔀")
  }

  @DualCommand({ description: "Zatrzymuje bota i kasuje kolejke" })
  async stop(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    const queue = this.player.getQueue(replyHandler.guild)

    queue?.destroy(true)

    await replyHandler.reply("Zatrzymałem i skasowałem kolejke")
  }

  @DualCommand({
    aliases: ["q"],
    description: "Wyświetla kolejkę"
  })
  async queue(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    const queue = this.player.getQueue(replyHandler.guild)

    if (!queue) return await replyHandler.reply("Kolejka nie istnieje")

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
          .setFooter({ text: `Strona ${chunkNumber + 1}/${numberOfChunks}` })
      )
    }

    if (!pages.length) return await replyHandler.reply("Kolejka jest pusta")

    new Pagination(
      replyHandler,
      pages.map(p => ({ embeds: [p] })),
      {
        type: PaginationType.Button,
        start: { label: "Początek" },
        previous: { label: "Poprzednia" },
        next: { label: "Następna" },
        end: { label: "Koniec" }
      }
    ).send()
  }

  @DualCommand({
    aliases: ["l", "tekst"],
    description: "Wyszukuje tekst piosenki"
  })
  async lyrics(
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
    const replyHandler = getReplyHandler(interactionOrMsg)
    if (!replyHandler.guild) return

    if (!query) {
      const queue = this.player.getQueue(replyHandler.guild)

      if (!queue?.current)
        return await replyHandler.reply("Nic nie jest odtwarzane")

      query = `${queue.current.title} ${queue.current.author}`
    }

    if (interactionOrMsg instanceof CommandInteraction) {
      await interactionOrMsg.deferReply()
    } else {
      await replyHandler.reply("Szukam: " + query)
    }

    const lyrics: string | undefined = await getLyrics(query)

    const msgPayload = lyrics
      ? {
        embeds: [
          new EmbedBuilder()
            .setTitle("Wyniki zapytania: " + query)
            .setDescription(lyrics)
        ]
      }
      : "Nie znalazłem tekstu"

    if (interactionOrMsg instanceof CommandInteraction) {
      await interactionOrMsg.editReply(msgPayload)
    } else {
      await replyHandler.reply(msgPayload)
    }
  }

  @DualCommand({
    name: "player",
    description: "Wysyła lub usuwa kontroler odtwarzania"
  })
  async musicControllerHandler(
    interactionOrMsg: CommandInteraction | SimpleCommandMessage
  ) {
    const replyHandler = getReplyHandler(interactionOrMsg)

    if (!replyHandler.guild || !(replyHandler.channel instanceof TextChannel))
      return

    const queue = this.player.getQueue(replyHandler.guild)

    if (!queue) {
      return await replyHandler.reply("Kolejka nie istnieje")
    }

    const controllerExists = Boolean(queue.metadata?.musiccontroller)

    if (interactionOrMsg instanceof CommandInteraction) {
      await interactionOrMsg.reply(
        controllerExists ? "Zamykam odtwarzacz" : "Otwieram odtwarzacz"
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
      ...queue.metadata,
      musiccontroller: newController
    }
  }
}
