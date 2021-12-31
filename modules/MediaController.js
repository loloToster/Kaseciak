const { TextChannel, MessageActionRow, MessageButton, Message, Interaction, MessageEmbed } = require("discord.js")
const { Player, Queue } = require("discord-player")

const DELETE_LOOPS = 3

class MediaController {
    /**
     * @param {TextChannel} channel 
     * @param {Player} player
     */
    constructor(channel, player, autoresend = false) {
        if (!channel) throw new Error("Channel cannot be undefinded")
        if (!player) throw new Error("Player cannot be undefinded")
        this.channel = channel
        this.player = player
        /** @type {Message|null}*/
        this._currentMsg = null

        this._trackStartListener = (q, t) => this.refresh(q)
        this.player.on("trackStart", this._trackStartListener)

        this._interactionCreateListener = this._interactionHandler.bind(this)
        this.player.client.on("interactionCreate", this._interactionCreateListener)

        if (autoresend) {
            this._messageCreateListener = this._resendHandler.bind(this)
            this.player.client.on("messageCreate", this._messageCreateListener)
        }
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

    /** @param {Interaction} i */
    async _interactionHandler(i) {
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

        await this.refresh()

        await i.deferUpdate()
    }

    /** @param {Message} msg */
    async _resendHandler(msg) {
        if (this.deleted) return
        if (msg.channelId != this.channel.id || msg.id == this._currentMsg?.id) return
        try {
            await this.resend()
        } catch (e) {
            console.error(e)
        }
    }

    /** @param {Queue} queue */
    _createEmbed(queue) {
        const emb = new MessageEmbed()
        const track = queue?.current

        if (track) {
            const timestamps = queue.getPlayerTimestamp()

            emb.setTitle(`**${track.title}**`)
                .setURL(track.url)
                .setThumbnail(track.thumbnail)
                .setDescription(track.author)
                .addField(
                    "\u2800",
                    `${timestamps.current}┃${queue.createProgressBar({ length: 13 })}┃${timestamps.end}`
                )
        } else {
            emb.setTitle("Nic nie jest odtwarzane")
        }

        return emb
    }

    async create() {
        if (this.deleted) return
        const queue = await this.getQueue()

        this._currentMsg = await this.channel.send({
            embeds: [
                this._createEmbed(queue)
            ],
            components: [
                new MessageActionRow()
                    .addComponents([
                        new MessageButton()
                            .setCustomId("shuffle")
                            .setEmoji("🔀")
                            .setStyle("SECONDARY"),
                        new MessageButton()
                            .setCustomId("prev")
                            .setEmoji("⏪")
                            .setStyle("SECONDARY"),
                        new MessageButton()
                            .setCustomId("pause-play")
                            .setEmoji("⏯️")
                            .setStyle("SECONDARY"),
                        new MessageButton()
                            .setCustomId("next")
                            .setEmoji("⏩")
                            .setStyle("SECONDARY"),
                        new MessageButton()
                            .setCustomId("refresh")
                            .setEmoji("🔄")
                            .setStyle("SECONDARY")
                    ])
            ]
        })
        return this
    }

    async resend() {
        if (this.deleted) return false
        try {
            await this._currentMsg.delete()
        } catch {
            return false
        }
        await this.create()
        return true
    }

    async refresh(q = null) {
        if (this.deleted) return false
        const queue = q || await this.getQueue()
        try {
            await this._currentMsg.edit({
                embeds: [
                    this._createEmbed(queue)
                ]
            })
        } catch { return false }
        return true
    }

    async delete() {
        this.deleted = true
        this.player.removeListener("trackStart", this._trackStartListener)
        this.player.client.removeListener("interactionCreate", this._interactionCreateListener)
        this.player.client.removeListener("messageCreate", this._messageCreateListener)

        // in case the message was not deleted in resend()
        let iter = 0
        const mc = this

        async function del() {
            try {
                await mc._currentMsg.delete()
            } catch (e) {
                iter++
                if (iter >= DELETE_LOOPS)
                    return
                setTimeout(del, 1000)
            }
        }

        del()
    }
}

module.exports = MediaController
