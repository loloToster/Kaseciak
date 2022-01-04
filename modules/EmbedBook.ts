import { Message, MessageEmbed, TextChannel, MessageActionRow, MessageButton, MessageButtonOptions } from "discord.js"
import { Bot } from "./Bot"

export interface EmbedBookOptions {
    pages: MessageEmbed[],
    channel: TextChannel,
    bot: Bot
}

export class EmbedBook {
    readonly pages: MessageEmbed[]

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
        let buttons: MessageButton[] = []

        const start = index == 0
        buttons.push(
            new MessageButton({ disabled: start } as MessageButtonOptions)
                .setCustomId("pagestart")
                .setEmoji("⏪")
                .setStyle("SECONDARY"),
            new MessageButton({ disabled: start } as MessageButtonOptions)
                .setCustomId("pageleft")
                .setEmoji("⬅️")
                .setStyle("SECONDARY")
        )

        const end = index == this.pages.length - 1
        buttons.push(
            new MessageButton({ disabled: end } as MessageButtonOptions)
                .setCustomId("pageright")
                .setEmoji("➡️")
                .setStyle("SECONDARY"),
            new MessageButton({ disabled: end } as MessageButtonOptions)
                .setCustomId("pageend")
                .setEmoji("⏩")
                .setStyle("SECONDARY")
        )

        return new MessageActionRow()
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
