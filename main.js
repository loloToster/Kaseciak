process.title = "KaseciakNode"

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

// load cogs
readdirSync("./cogs").forEach(dir => {
    if (!dir.endsWith(".js")) return
    let cogName = dir.slice(0, -3)
    let cog = require("./cogs/" + cogName)
    cog.cog_name = cogName
    client.cogs.push(cog)
})

client.getCommand = function (name) {
    for (const cog in this.cogs) {
        for (const cmd in this.cogs[cog]) {
            let aliases = this.cogs[cog][cmd].aliases || []
            if (name == cmd || aliases.includes(name)) {
                let func = this.cogs[cog][cmd].execute
                if (typeof func != "function") continue
                let result = this.cogs[cog][cmd]
                result.name = cmd
                result.cog = this.cogs[cog].cog_name
                return result
            }
        }
    }
    return false
}

client.executeCommand = async function (msg, cmdName, args) {
    const cmd = this.getCommand(cmdName)
    if (!cmd) return false
    try {
        await cmd.execute(msg, args, this)
    } catch (err) {
        console.error(err)
    }
    return true
}

client.on("messageCreate", async msg => {
    let content = msg.content
    if (!content.startsWith(prefix)) return

    content = content.substring(prefix.length)

    let args = content.split(/ +/g)
    let command = args.shift()

    let result = await client.executeCommand(msg, command, args)
    if (!result) msg.channel.send(`Nie znam komendy ${command}`)
})

client.login(process.env.TOKEN)
