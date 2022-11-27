import { Player, Queue } from "discord-player"
import { TextChannel } from "discord.js"
import { Bot } from "discord.js-ext"
import MediaController from "../modules/MediaController"

export interface CustomMetadata {
    mc?: MediaController,
    channel: TextChannel,
    radios: string[]
}

export default (bot: Bot) => {
    const player = new Player(bot, { ytdlOptions: { quality: "lowestaudio" } })

    async function onError(type: string, queue: Queue<CustomMetadata>, error: Error) {
        const msg = `${type}: \`${error.message}\``
        console.log(msg)

        if (queue.metadata)
            await queue.metadata.channel.send(msg)
    }

    player.on("error", (q: Queue<any>, e) => onError("error", q, e))
    player.on("connectionError", (q: Queue<any>, e) => onError("connectionError", q, e))

    return player
}
