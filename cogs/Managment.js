const { Client, Message, MessageEmbed } = require("discord.js")
const { existsSync } = require("fs")
const { readFile, writeFile } = require("fs/promises")

const readJSON = async p => JSON.parse(await readFile(p, "utf-8"))
const writeJSON = async (p, obj) => await writeFile(p, JSON.stringify(obj))

if (!existsSync("./prefixes.json"))
    writeJSON("./prefixes.json", {})

module.exports = {
    ping: {
        description: "Sprawdza czy bot jest uruchomiony",
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Client} client
         */
        async execute(msg, args, client) {
            await msg.channel.send(`Pong! \`${msg.createdTimestamp - Date.now()}ms\``)
        }
    },
    prefix: {
        description: "Zmienia prefix",
        usage: "prefix {nowy prefix}",
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Client} client
         */
        async execute(msg, args, client) {
            let data = await readJSON("./prefixes.json")

            if (!args[0]) {
                let currentPrefix = data[msg.guildId] || client.prefix
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
    help: {
        aliases: ["h"],
        description: "Wyświetla pomoc",
        usage: "help {komenda:opcjonalne}",
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Client} client
         */
        async execute(msg, args, client) {
            let emb = new MessageEmbed()

            if (args[0]) {
                const cmd = client.getCommand(args[0])
                if (cmd) {
                    let invokeMethods = cmd.aliases
                    invokeMethods.unshift(cmd.name)

                    let invokeMethodsText = ""
                    for (const method of invokeMethods) {
                        invokeMethodsText += `• \`${client.prefix}${method}\`\n`
                    }

                    emb.setTitle(`${cmd.cog} > ${cmd.name}:`)
                        .addField("Opis:", cmd.description || "Ta komenda nie ma opisu")
                        .addField("Wywoływanie:", invokeMethodsText)
                        .addField("Używanie:", "```\n" + client.prefix + (
                            cmd.usage || cmd.name
                        ) + "\n```")

                    return await msg.channel.send({
                        embeds: [emb]
                    })
                }
            }

            for (const cog in client.cogs) {
                let text = ""
                for (const cmd of client.cogs[cog].commands) {
                    text += `- ${cmd.name}\n`
                }
                emb.addField(`**${cog}:**`, text, false)
            }

            const prefix = typeof client.prefix == "function" ?
                await client.prefix(client, msg) : client.prefix

            emb.setFooter(prefix + "help {nazwa komendy}")

            await msg.channel.send({
                embeds: [emb]
            })
        }
    }
}
