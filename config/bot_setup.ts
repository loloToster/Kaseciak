// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array: Array<any>) {
    let currentIndex = array.length, randomIndex

    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex)
        currentIndex--

        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]]
    }

    return array
}

import { Bot } from "../modules/Bot"
import { Intents, Message } from "discord.js"
import { Player, Queue } from "discord-player"
import { readFile } from "fs/promises"

const readJSON = async (p: string) => JSON.parse(await readFile(p, "utf-8"))

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
    ]
}, {
    prefix: async (bot: Bot, msg: Message) =>
        (await readJSON("./prefixes.json"))[msg.guildId ?? ""] || process.env.DEF_PREFIX
})

bot.loop("status", async () => {
    //@ts-ignore: Property 'player' does not exist on type 'Bot'.
    const player: Player = bot.player

    const shuffledQueues: Queue[] = shuffle(Array.from(player.queues)
        .map((q: any): Queue => q[1]))

    if (!shuffledQueues.length)
        return bot.user?.setActivity()

    let track = null
    for (const queue of shuffledQueues) {
        if (queue.current) {
            track = queue.current
            break
        }
    }

    if (track)
        bot.user?.setActivity({ name: track.title, url: track.url, type: "LISTENING" })
    else
        bot.user?.setActivity()

}, 20000)

bot.on("loopError", (name: string, err: Error) => {
    console.error(name + ":", err)
})

bot.once("ready", () => {
    console.log("Ready!")
    bot.loops.status.start()
})

bot.on("checkError", async (msg: Message, err: Error) => {
    if (err.message.includes("isConnectedToVoiceChannel")) {
        await msg.channel.send("Musisz być na kanale głosowym aby użyć tej komendy")
    } else if (err.message.includes("isAdmin")) {
        await msg.channel.send("Musisz być administratorem aby użyć tej komendy")
    } else
        console.log("checkError: " + err.message)
})

bot.on("commandNotFound", async (msg: Message, command: string, args: string[]) => {
    await msg.channel.send(`Nie znam komendy ${command}`)
})

bot.on("commandError", async (msg: Message, command: string, err: Error) => {
    console.error(err)
})

export default bot
