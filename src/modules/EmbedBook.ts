import {
    Message,
    EmbedBuilder,
    TextChannel,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageActionRowComponentBuilder
} from "discord.js"

import { Bot } from "discord.js-ext"

export interface EmbedBookOptions {
    pages: EmbedBuilder[],
    channel: TextChannel,
    bot: Bot
}

export class EmbedBook {
    readonly pages: EmbedBuilder[]

    private currentIndex: number
    private message: Message | null

    constructor({ pages, channel, bot }: EmbedBookOptions) {
        if (!pages.length) throw new Error("Pages cannot be empty")

        this.currentIndex = 0
        this.pages = pages
        this.message = null

        channel.send({
            embeds: [this.pages[this.currentIndex]],
            components: [this._createButtons()]
        }).then(msg => {
            this.message = msg

            bot.on("interactionCreate", async i => {
                if (!i.isButton() || i.message.id != msg.id) return

                switch (i.customId) {
                    case "pagestart":
                        await this.goTo(0)
                        break

                    case "pageleft":
                        await this.move(-1)
                        break

                    case "pageright":
                        await this.move(1)
                        break

                    case "pageend":
                        await this.goTo(this.pages.length - 1)
                        break

                    default:
                        break
                }

                await i.deferUpdate().catch(console.error)
            })
        })
    }

    _createButtons(index: number = this.currentIndex) {
        let buttons: ButtonBuilder[] = []

        const start = index == 0
        buttons.push(
            new ButtonBuilder({ disabled: start })
                .setCustomId("pagestart")
                .setEmoji("⏪")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder({ disabled: start })
                .setCustomId("pageleft")
                .setEmoji("⬅️")
                .setStyle(ButtonStyle.Secondary)
        )

        const end = index == this.pages.length - 1
        buttons.push(
            new ButtonBuilder({ disabled: end })
                .setCustomId("pageright")
                .setEmoji("➡️")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder({ disabled: end })
                .setCustomId("pageend")
                .setEmoji("⏩")
                .setStyle(ButtonStyle.Secondary)
        )

        return new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(buttons)
    }

    async _edit(index: number) {
        if (!this.message) throw new Error("No message")
        await this.message.edit({
            embeds: [this.pages[index]],
            components: [this._createButtons(index)]
        })
    }

    async move(steps: number) {
        if (!this.message) return false

        let newIndex = this.currentIndex + steps

        if (!this.pages[newIndex]) return false

        try {
            await this._edit(newIndex)
        } catch {
            return false
        }

        this.currentIndex = newIndex

        return true
    }

    async goTo(index: number) {
        if (!this.message || !this.pages[index]) return false

        try {
            await this._edit(index)
        } catch {
            return false
        }

        this.currentIndex = index

        return true
    }
}
