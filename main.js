process.title = "KaseciakNode"

require("dotenv").config()
const { Client, Intents } = require("discord.js")
const { Player } = require("discord-player")
const { readFile } = require("fs/promises")

const readJSON = async p => JSON.parse(await readFile(p, "utf-8"))

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_VOICE_STATES
    ]
})

client.prefix = ">"

require("./CogsModule")(client)

client.once("ready", () => {
    console.log("Ready!")
})

client.player = new Player(client)

client.loadCogsFromDir("./cogs")

client.on("messageCreate", async msg => {
    let content = msg.content
    const prefix = (await readJSON("./prefixes.json"))[msg.guildId] || client.prefix

    if (!content.startsWith(prefix)) return

    content = content.substring(prefix.length)

    // exit command for bot's owner
    if (content == "exit" && msg.author.id == process.env.OWNER)
        process.exit(0)

    let args = content.split(/ +/g)
    let command = args.shift()

    let result = await client.executeCommand(msg, command, args)
    if (!result) await msg.channel.send(`Nie znam komendy ${command}`)
})

client.login(process.env.TOKEN)
