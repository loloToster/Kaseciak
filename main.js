process.title = "KaseciakNode"

require("dotenv").config()
const { Client, Intents } = require("discord.js")
const { Player } = require("discord-player")

const prefix = ">"

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_VOICE_STATES
    ]
})

require("./CogsModule")(client)

client.once("ready", () => {
    console.log("Ready!")
})

client.player = new Player(client)

client.loadCogsFromDir("./cogs")

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
