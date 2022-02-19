import { Bot, RawCog } from "discord.js-ext"
import { Kaseciak } from "../main"

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
            try {
                await ctx.send("Exiting...")
            } catch { /* exit no matter what */ }
            process.exit(0)
        }
    },
    reloadDb: {
        async command(ctx, args) {
            let bot = ctx.bot as Kaseciak
            bot.db.reload()
            await ctx.send("Db reloaded")
        }
    }
}

export function setup(bot: Bot) {
    bot.addCog(cog)
}
