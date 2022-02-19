import { MessageEmbed, TextChannel } from "discord.js"
import { Bot, RawCog } from "discord.js-ext"
import { Kaseciak } from "../main"

const cog: RawCog = {
    name: "Managment",
    isAdmin: {
        check(ctx, args) {
            return Boolean(
                ctx.message.member?.permissionsIn(ctx.channel as TextChannel)
                    .has("ADMINISTRATOR")
            )
        }
    },
    ping: {
        description: "Sprawdza czy bot jest uruchomiony",
        async command(ctx, args) {
            await ctx.send(`Pong! \`${ctx.bot.ws.ping}ms\``)
        }
    },
    prefix: {
        check: ["isAdmin"],
        description: "Zmienia prefix",
        usage: "prefix {nowy prefix}",
        async command(ctx, args) {
            if (!ctx.guild) return

            let bot = ctx.bot as Kaseciak

            if (!args[0]) {
                let currentPrefix = bot.db.getData("/guilds")[ctx.guild.id]?.prefix || process.env.DEF_PREFIX
                return await ctx.send(`Aktualny prefix to: \`${currentPrefix}\``)
            }

            let newPrefix = args[0]
            if (newPrefix.length > 10)
                return await ctx.send("Prefix nie może mieć więcej niż 10 znaków")

            bot.db.push("/guilds", { [ctx.guild.id]: { prefix: newPrefix } })
            await ctx.send(`Nowy prefix to: \`${newPrefix}\``)
        }
    },
    help: {
        aliases: ["h"],
        description: "Wyświetla pomoc",
        usage: "help {komenda:opcjonalne}",
        async command(ctx, args) {
            let emb = new MessageEmbed()

            let bot = ctx.bot
            const prefix = typeof bot.prefix == "function" ?
                await bot.prefix(bot, ctx.message) : bot.prefix

            if (args[0]) {
                const cmd = bot.getCommand(args[0])
                if (cmd) {
                    let invokeMethods = cmd.aliases || []
                    invokeMethods.unshift(cmd.name)

                    let invokeMethodsText = ""
                    for (const method of invokeMethods) {
                        invokeMethodsText += `• \`${prefix}${method}\`\n`
                    }

                    emb.setTitle(`${cmd.cog} > ${cmd.name}:`)
                        .addField("Opis:", cmd.description || "Ta komenda nie ma opisu")
                        .addField("Wywoływanie:", invokeMethodsText)
                        .addField("Używanie:", "```\n" + prefix + (
                            cmd.usage || cmd.name
                        ) + "\n```")

                    return await ctx.send({
                        embeds: [emb]
                    })
                }
            }

            for (const cog in bot.cogs) {
                let text = ""
                for (const cmd of bot.cogs[cog].commands) {
                    text += `- ${cmd.name}\n`
                }
                emb.addField(`**${cog}:**`, text, false)
            }

            emb.setFooter({ text: prefix + "help {nazwa komendy}" })

            await ctx.send({
                embeds: [emb]
            })
        }
    }
}

export function setup(bot: Bot) {
    bot.addCog(cog)
}
