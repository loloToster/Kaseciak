import { Player, Queue } from "discord-player"
import { Bot } from "../modules/Bot"

module.exports = (bot: Bot) => {
    const player = new Player(bot)

    async function onError(type: string, queue: Queue, error: Error) {
        const msg = `${type}: \`${error.message}\``
        console.log(msg)

        const metadata: any = queue.metadata
        await metadata.channel.send(msg)
    }

    player.on("error", (q, e) => onError("error", q, e))
    player.on("connectionError", (q, e) => onError("connectionError", q, e))

    return player
}
