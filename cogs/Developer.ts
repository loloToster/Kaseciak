import { Message } from "discord.js"
import { Bot } from "../modules/Bot"

export default {
    exit: {
        async execute(msg: Message, args: string[], bot: Bot) {
            if (msg.author.id == process.env.OWNER)
                process.exit(0)
        }
    }
}
