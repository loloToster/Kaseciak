process.title = "KaseciakNode"

require("dotenv").config()
const { Intents } = require("discord.js")
const { Player, Queue } = require("discord-player")
const { readFile } = require("fs/promises")

const Bot = require("./Bot")

const readJSON = async p => JSON.parse(await readFile(p, "utf-8"))

const DEF_PREFIX = ">"
const bot = new Bot({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_BANS,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Intents.FLAGS.GUILD_INTEGRATIONS,
        Intents.FLAGS.GUILD_WEBHOOKS,
        Intents.FLAGS.GUILD_INVITES,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_PRESENCES,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_MESSAGE_TYPING,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
        Intents.FLAGS.DIRECT_MESSAGE_TYPING,
        Intents.FLAGS.GUILD_SCHEDULED_EVENTS,
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

const player = new Player(bot)

/**
 * @param {String} type 
 * @param {Queue} queue 
 * @param {Error} error 
 */
async function onError(type, queue, error) {
    const msg = `${type}: \`${error.message}\``
    console.log(msg)
    await queue.metadata.channel.send(msg)
}

player.on("error", (q, e) => onError("error", q, e))
player.on("connectionError", (q, e) => onError("connectionError", q, e))

bot.player = player

bot.loadCogsFromDir("./cogs")

bot.login(process.env.TOKEN)
