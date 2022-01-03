import { Message, MessageEmbed, TextChannel } from "discord.js"
import { existsSync } from "fs"
import { readFile, writeFile } from "fs/promises"
import { Bot } from "../modules/Bot"

const readJSON = async (p: string) => JSON.parse(await readFile(p, "utf-8"))
const writeJSON = async (p: string, obj: Object) => await writeFile(p, JSON.stringify(obj))

export default {
    _init: (bot: Bot) => {
        if (!existsSync("./prefixes.json"))
            writeJSON("./prefixes.json", {})
    },
    checks: [
        {
            name: "isAdmin",
            check(msg: Message, args: string[], bot: Bot) {
                return msg.member?.permissionsIn(msg.channel as TextChannel).has("ADMINISTRATOR")
            }
        }
    ],
    commands: [
        {
            name: "ping",
            description: "Sprawdza czy bot jest uruchomiony",
            async execute(msg: Message, args: string[], bot: Bot) {
                await msg.channel.send(`Pong! \`${msg.createdTimestamp - Date.now()}ms\``)
            }
        },
        {
            name: "prefix",
            check: ["isAdmin"],
            description: "Zmienia prefix",
            usage: "prefix {nowy prefix}",
            async execute(msg: Message, args: string[], bot: Bot) {
                if (!msg.guildId) return

                let data = await readJSON("./prefixes.json")

                if (!args[0]) {
                    let currentPrefix = data[msg.guildId] || process.env.DEF_PREFIX
                    return await msg.channel.send(`Aktualny prefix to: \`${currentPrefix}\``)
                }

                let newPrefix = args[0]
                if (newPrefix.length > 10)
                    return await msg.channel.send("Prefix nie może mieć więcej niż 10 znaków")

                data[msg.guildId] = newPrefix
                await writeJSON("./prefixes.json", data)
                await msg.channel.send(`Nowy prefix to: \`${newPrefix}\``)
            }
        },
        {
            name: "help",
            aliases: ["h"],
            description: "Wyświetla pomoc",
            usage: "help {komenda:opcjonalne}",
            async execute(msg: Message, args: string[], bot: Bot) {
                let emb = new MessageEmbed()

                const prefix = typeof bot.prefix == "function" ?
                    await bot.prefix(bot, msg) : bot.prefix

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

                        return await msg.channel.send({
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

                await msg.channel.send({
                    embeds: [emb]
                })
            }
        }
    ]
}
