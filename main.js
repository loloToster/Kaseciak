process.title = "KaseciakNode"

require("dotenv").config()
const { Intents } = require("discord.js")
const { Player } = require("discord-player")
const { readFile } = require("fs/promises")

const Bot = require("./Bot")

const readJSON = async p => JSON.parse(await readFile(p, "utf-8"))

const bot = new Bot({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_VOICE_STATES
    ]
})

bot.prefix = ">"

bot.once("ready", () => {
    console.log("Ready!")
})

bot.player = new Player(bot)

bot.loadCogsFromDir("./cogs")

bot.on("messageCreate", async msg => {
    let content = msg.content
    const prefix = (await readJSON("./prefixes.json"))[msg.guildId] || bot.prefix

    if (!content.startsWith(prefix)) return

    content = content.substring(prefix.length)

    // exit command for bot's owner
    if (content == "exit" && msg.author.id == process.env.OWNER)
        process.exit(0)

    let args = content.split(/ +/g)
    let command = args.shift()

    let result = await bot.executeCommand(msg, command, args)
    if (!result) await msg.channel.send(`Nie znam komendy ${command}`)
})

bot.login(process.env.TOKEN)
