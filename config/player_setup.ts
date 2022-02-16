import { Player, Queue } from "discord-player"
import { Bot } from "discord.js-ext"
import { CustomMetadata } from "../modules/MediaController"

export default (bot: Bot) => {
    const player = new Player(bot)

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
