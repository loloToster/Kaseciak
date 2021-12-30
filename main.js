process.title = "KaseciakNode"

require("dotenv").config()
const { Intents } = require("discord.js")
const { Player } = require("discord-player")
const { readFile } = require("fs/promises")

const Bot = require("./Bot")

const readJSON = async p => JSON.parse(await readFile(p, "utf-8"))

const DEF_PREFIX = ">"
const bot = new Bot({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_VOICE_STATES
    ],
    prefix: async (bot, msg) =>
        (await readJSON("./prefixes.json"))[msg.guildId] || DEF_PREFIX
})

bot.once("ready", () => {
    console.log("Ready!")
})

bot.on("commandNotFound", async (msg, command, args) => {
    await msg.channel.send(`Nie znam komendy ${command}`)
})

bot.player = new Player(bot)

bot.loadCogsFromDir("./cogs")

bot.login(process.env.TOKEN)
