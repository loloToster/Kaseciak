require("dotenv").config()
const { Client, Intents } = require("discord.js")
const { Player } = require("discord-player")
const { readdirSync } = require("fs")

const prefix = ">"

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_VOICE_STATES
    ]
})

client.once("ready", () => {
    console.log("Ready!")
})

client.cogs = []
client.player = new Player(client)

readdirSync("./cogs").forEach(dir => {
    if (!dir.endsWith(".js")) return
    let cog = require("./cogs/" + dir.slice(0, -3))
    client.cogs.push(cog)
})

async function executeCommand(msg, cmdName, args) {
    for (const cog in client.cogs) {
        for (const cmd in client.cogs[cog]) {
            let aliases = client.cogs[cog][cmd].aliases || []
            if (cmdName == cmd || aliases.includes(cmdName)) {
                let func = client.cogs[cog][cmd].execute
                if (typeof func != "function") continue
                try {
                    await func(msg, args, client)
                } catch (err) {
                    console.error(err)
                }
                return true
            }
        }
    }
    return false
}

client.on("messageCreate", async msg => {
    let content = msg.content
    if (!content.startsWith(prefix)) return

    content = content.substring(prefix.length)

    let args = content.split(/ +/g)
    let command = args.shift()

    let result = await executeCommand(msg, command, args)
    if (!result) msg.channel.send(`Nie znam komendy ${command}`)
})

client.login(process.env.TOKEN)
