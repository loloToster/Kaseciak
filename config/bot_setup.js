// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
    let currentIndex = array.length, randomIndex

    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex)
        currentIndex--

        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]]
    }

    return array
}

const Bot = require("../modules/Bot")
const { Intents } = require("discord.js")
const { Player, Queue } = require("discord-player")
const { readFile } = require("fs/promises")

const readJSON = async p => JSON.parse(await readFile(p, "utf-8"))

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
        (await readJSON("./prefixes.json"))[msg.guildId] || process.env.DEF_PREFIX
})

bot.loop("status", async () => {
    /**@type {Player} */
    const player = bot.player

    /**@type {Queue[]} */
    const shuffledQueues = shuffle(Array.from(player.queues).map(q => q[1]))

    if (!shuffledQueues.length)
        return bot.user.setActivity()

    let track = null
    for (const queue of shuffledQueues) {
        if (queue.current) {
            track = queue.current
            break
        }
    }

    if (track)
        bot.user.setActivity({ name: track.title, url: track.url, type: "LISTENING" })
    else
        bot.user.setActivity()

}, 20000)

bot.on("loopError", (name, e) => {
    console.error(name + ":", e)
})

bot.once("ready", () => {
    console.log("Ready!")
    bot.loops.status.start()
})

bot.on("commandNotFound", async (msg, command, args) => {
    await msg.channel.send(`Nie znam komendy ${command}`)
})

bot.on("commandError", async (msg, err) => {
    console.error(err)
})

module.exports = bot
