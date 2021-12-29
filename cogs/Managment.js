const { Client, Message, MessageEmbed } = require("discord.js")

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
            emb.setFooter(client.prefix + "help {nazwa komendy}")

            await msg.channel.send({
                embeds: [emb]
            })
        }
    }
}
