import { Bot, RawCog } from "discord.js-ext"

const cog: RawCog = {
    name: "Developer",
    isOwner: {
        global: true,
        async check(ctx, args) {
            return ctx.author.id == process.env.OWNER
        }
    },
    exit: {
        async command(ctx, args) {
            process.exit(0)
        }
    }
}

export function setup(bot: Bot) {
    bot.addCog(cog)
}
