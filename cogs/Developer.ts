import { Cog } from "../modules/Bot"

const cog: Cog = {
    checks: [
        {
            name: "isOwner",
            global: true,
            async check(msg, args, bot) {
                return msg.author.id == process.env.OWNER
            }
        }
    ],
    commands: [
        {
            name: "exit",
            async execute(msg, args, bot) {
                process.exit(0)
            }
        }
    ]
}

export default cog
