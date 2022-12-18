import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ClientEvents,
  EmbedBuilder,
  HexColorString,
  Interaction,
  Message,
  MessageActionRowComponentBuilder,
  TextChannel
} from "discord.js"
import { Player, Queue, PlayerEvents } from "discord-player"
import AsyncLock from "async-lock"

import getColor from "./getColor"

export interface MusicControllerOptions {
  player: Player
  channel: TextChannel
  refreshInterval?: number
  autoresend?: boolean
}

export default class MusicController<M = unknown> {
  player: Player
  channel: TextChannel

  lastAction: string
  deleted: boolean

  private msg: Message | null
  private msgLock: AsyncLock
  private listeners: Array<[string, (...x: any[]) => any]>
  private refreshInterval: NodeJS.Timer

  constructor(opts: MusicControllerOptions) {
    this.player = opts.player
    this.channel = opts.channel

    opts.refreshInterval = opts.refreshInterval ?? 5000
    opts.autoresend = opts.autoresend === undefined ? true : opts.autoresend

    this.deleted = false
    this.lastAction = ""

    this.msg = null
    this.msgLock = new AsyncLock()
    this.listeners = []

    this.refreshInterval = setInterval(
      this.refresh.bind(this),
      opts.refreshInterval
    )

    this.addPlayerListener("trackStart", this.refresh)
    this.addClientListener("interactionCreate", this._interactionHandler)

    if (opts.autoresend) {
      this.addClientListener("messageCreate", this._resendHandler)
    }
  }

  get queue() {
    const queue = this.player.getQueue<M>(this.channel.guildId)
    if (!queue) this.delete()
    return queue
  }

  private addPlayerListener<K extends keyof PlayerEvents>(
    event: K,
    listener: PlayerEvents[K]
  ) {
    const bindedListener = listener.bind(this)
    this.listeners.push([event, bindedListener])
    this.player.on(event, listener)
  }

  private addClientListener<K extends keyof ClientEvents>(
    event: K,
    listener: (...args: ClientEvents[K]) => any
  ) {
    const bindedListener = listener.bind(this)
    this.listeners.push([event, bindedListener])
    this.player.client.on(event, bindedListener)
  }

  private async _interactionHandler(interaction: Interaction) {
    if (
      !this.queue ||
      !interaction.isButton() ||
      interaction.channelId !== this.channel.id ||
      interaction.message.id !== this.msg?.id
    )
      return

    switch (interaction.customId) {
      case "shuffle":
        this.queue.shuffle()
        break

      case "prev":
        await this.queue.back().catch(console.error)
        break

      case "pause-play":
        this.queue.setPaused(!this.queue.connection.paused)
        break

      case "next":
        this.queue.skip()
        break

      default:
        break
    }

    this.lastAction = `${interaction.user.username}#${interaction.user.discriminator} used: \`${interaction.component.emoji?.name}\``

    await this.refresh()

    await interaction.deferUpdate().catch(console.error)
  }

  private async _resendHandler(msg: Message) {
    if (this.msgLock.isBusy("")) return

    return await this.msgLock.acquire("", async () => {
      if (
        this.deleted || // the controller is deleted
        !this.msg || // or there is no message
        msg.channelId != this.channel.id || // or channel is not the assigned channel
        msg.id == this.msg.id // or the message is the same as current message
      )
        return

      await this.resend().catch(console.error)
    })
  }

  async send() {
    await this.resend()
    return this
  }

  async resend() {
    try {
      await this.msg?.delete()
    } catch {
      return false
    }

    this.msg = await this.channel.send(await this.createMsgPayload())

    return true
  }

  async refresh() {
    if (!this.queue) return false

    try {
      if (!this.msg) return false
      await this.msg.edit(await this.createMsgPayload())
    } catch {
      return false
    }

    return true
  }

  async delete() {
    this.deleted = true
    clearInterval(this.refreshInterval)

    // remove all listeners
    this.listeners.forEach(([ev, l]) => {
      this.player.removeListener(ev as keyof PlayerEvents, l)
      this.player.client.removeListener(ev, l)
    })

    await this.msgLock.acquire("", async () => {
      await this.msg?.delete()
      this.msg = null
    })
  }

  async createEmbed(queue: Queue | undefined) {
    const emb = new EmbedBuilder()
    const track = queue?.current

    if (track) {
      const timestamps = queue.getPlayerTimestamp()

      const user = track.requestedBy
      if (user)
        emb.setAuthor({
          name: `Added by: ${user.username}#${user.discriminator}`,
          iconURL: user.avatarURL() ?? undefined
        })

      emb
        .setTitle(`**${track.title}**`)
        .setURL(track.url)
        .setThumbnail(track.thumbnail)
        .addFields({
          name: track.author || "\u200b",
          value: `${timestamps.current}┃${queue.createProgressBar({
            length: 13
          })}┃${timestamps.end}`,
          inline: false
        })

      const color = await getColor(track.thumbnail, 500, track.id)
      if (color) emb.setColor(color as HexColorString)

      const prevTrack = queue.previousTracks.at(-2)
      if (prevTrack)
        emb.addFields({
          name: "Previous:",
          value: `${prevTrack.title} \`${prevTrack.author}\``,
          inline: true
        })

      const nextTrack = queue.tracks[0]
      if (nextTrack)
        emb.addFields({
          name: "Next:",
          value: `${nextTrack.title} \`${nextTrack.author}\``,
          inline: true
        })
    } else {
      emb.setTitle("Nothing is being played")
    }

    return emb
  }

  async createMsgPayload() {
    const btns =
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents([
        new ButtonBuilder()
          .setCustomId("shuffle")
          .setEmoji("🔀")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("prev")
          .setEmoji("⏪")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("pause-play")
          .setEmoji("⏯️")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("next")
          .setEmoji("⏩")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("refresh")
          .setEmoji("🔄")
          .setStyle(ButtonStyle.Secondary)
      ])

    return {
      content: this.lastAction || undefined,
      embeds: [await this.createEmbed(this.queue)],
      components: [btns]
    }
  }
}
