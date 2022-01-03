import { Message } from "discord.js"
import { Bot } from "../modules/Bot"

export default {
    checks: [
        {
            name: "isOwner",
            global: true,
            async check(msg: Message, args: string[], bot: Bot) {
                return msg.author.id == process.env.OWNER
            }
        }
    ],
    commands: [
        {
            name: "exit",
            async execute(msg: Message, args: string[], bot: Bot) {
                process.exit(0)
            }
        }
    ]
}
