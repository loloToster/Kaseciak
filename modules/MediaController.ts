import {
    TextChannel,
    ActionRowBuilder,
    ButtonBuilder,
    Message,
    Interaction,
    EmbedBuilder,
    HexColorString,
    ButtonStyle,
    MessageActionRowComponentBuilder
} from "discord.js"

import { Player, Queue, Track } from "discord-player"
import getColor from "./getColor"

const DELETE_LOOPS = 3

export interface CustomMetadata {
    mc?: MediaController,
    channel: TextChannel
}

export default class MediaController {
    channel: TextChannel
    player: Player
    refreshInterval: number
    deleted: boolean

    lastAction: string

    private currentMsg: Message | null

    _trackStartListener: (q: Queue, t: Track) => any
    _interactionCreateListener: (i: Interaction) => any
    _messageCreateListener: undefined | ((m: Message) => any)

    constructor(channel: TextChannel, player: Player, refreshInterval: number, autoresend = false) {
        if (!channel) throw new Error("Channel cannot be undefinded")
        if (!player) throw new Error("Player cannot be undefinded")

        this.channel = channel
        this.player = player
        this.refreshInterval = refreshInterval
        this.deleted = false

        this.lastAction = ""

        this.currentMsg = null

        this._trackStartListener = (q, t) => this.refresh(q)
        this.player.on("trackStart", this._trackStartListener)

        this._interactionCreateListener = this._interactionHandler.bind(this)
        this.player.client.on("interactionCreate", this._interactionCreateListener)

        if (autoresend) {
            this._messageCreateListener = this._resendHandler.bind(this)
            this.player.client.on("messageCreate", this._messageCreateListener)
        }

        this._refreshLoop()
    }

    async getQueue() {
        if (this.deleted) return null
        const queue = this.player.getQueue(this.channel.guildId)
        if (queue?.destroyed) {
            await this.delete()
            return null
        }
        return queue
    }

    async _interactionHandler(i: Interaction) {
        if (this.deleted) return false
        if (!i.isButton() || i.channelId != this.channel.id) return

        const queue = await this.getQueue()

        if (!queue) return

        switch (i.customId) {
            case "shuffle":
                queue.shuffle()
                break

            case "prev":
                try {
                    queue.back()
                } catch { }
                break

            case "pause-play":
                queue.setPaused(!queue.connection.paused)
                break

            case "next":
                queue.skip()
                break

            default:
                break
        }

        this.lastAction = `${i.user.username}#${i.user.discriminator} kliknał: \`${i.component.emoji?.name}\``

        await this.refresh()

        await i.deferUpdate().catch(console.error)
    }

    async _resendHandler(msg: Message) {
        if (this.deleted || // if media controller is deleted
            !this.currentMsg || // or there is no message
            msg.channelId != this.channel.id || // or channel is not the assigned channel
            msg.id == this.currentMsg.id) // or the message is the same as current message
            return
        try {
            await this.resend()
        } catch (e) {
            console.error(e)
        }
    }

    async _createEmbed(queue: Queue) {
        const emb = new EmbedBuilder()
        const track = queue?.current

        if (track) {
            const timestamps = queue.getPlayerTimestamp()

            const user = track.requestedBy
            if (user)
                emb.setAuthor({
                    name: `Dodane przez: ${user.username}#${user.discriminator}`,
                    iconURL: user.avatarURL() ?? undefined
                })

            emb.setTitle(`**${track.title}**`)
                .setURL(track.url)
                .setThumbnail(track.thumbnail)
                .addFields({
                    name: track.author || "\u200b",
                    value: `${timestamps.current}┃${queue.createProgressBar({ length: 13 })}┃${timestamps.end}`,
                    inline: false
                })

            const color = await getColor(track.thumbnail, 500, track.id)
            if (color)
                emb.setColor(color as HexColorString)

            const prevTrack = queue.previousTracks.at(-2)
            if (prevTrack)
                emb.addFields({ name: "Poprzednia:", value: `${prevTrack.title} \`${prevTrack.author}\``, inline: true })

            const nextTrack = queue.tracks[0]
            if (nextTrack)
                emb.addFields({ name: "Następna:", value: `${nextTrack.title} \`${nextTrack.author}\``, inline: true })
        } else {
            emb.setTitle("Nic nie jest odtwarzane")
        }

        return emb
    }

    async create() {
        if (this.deleted) return
        const queue = await this.getQueue()
        if (!queue) return

        const buttonRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents([
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

        this.currentMsg = await this.channel.send({
            content: this.lastAction || undefined,
            embeds: [
                await this._createEmbed(queue)
            ],
            components: [buttonRow]
        })
        return this
    }

    async resend() {
        if (this.deleted) return false
        try {
            await this.currentMsg?.delete()
        } catch {
            return false
        }
        await this.create()
        return true
    }

    async refresh(q: Queue | null = null) {
        if (this.deleted) return false
        const queue = q || await this.getQueue()
        if (!queue) return false

        try {
            await this.currentMsg?.edit({
                content: this.lastAction || undefined,
                embeds: [
                    await this._createEmbed(queue)
                ]
            })
        } catch { return false }
        return true
    }

    async _refreshLoop() {
        if (this.deleted) return
        await this.refresh()
        setTimeout(this._refreshLoop.bind(this), this.refreshInterval)
    }

    async delete() {
        this.deleted = true
        this.player.removeListener("trackStart", this._trackStartListener)
        this.player.client.removeListener("interactionCreate", this._interactionCreateListener)
        if (this._messageCreateListener)
            this.player.client.removeListener("messageCreate", this._messageCreateListener)

        // in case the message was not deleted in resend()
        let iter = 0
        const mc = this

        async function del() {
            try {
                await mc.currentMsg?.delete()
            } catch (e) {
                if (++iter >= DELETE_LOOPS)
                    return
                setTimeout(del, 1000)
            }
        }

        del()
    }
}
