import { Bot } from "discord.js-ext"
import { ActivityType, GatewayIntentBits as Intents, Message } from "discord.js"
import { Player, Queue, Track } from "discord-player"
import { Kaseciak } from "../main"

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle<T>(array: T[]) {
    let currentIndex = array.length, randomIndex

    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex)
        currentIndex--

        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]]
    }

    return array
}

const bot = new Bot({
    intents: [
        Intents.Guilds,
        Intents.GuildMembers,
        Intents.GuildBans,
        Intents.GuildEmojisAndStickers,
        Intents.GuildIntegrations,
        Intents.GuildWebhooks,
        Intents.GuildInvites,
        Intents.GuildVoiceStates,
        Intents.GuildPresences,
        Intents.GuildMessages,
        Intents.MessageContent,
        Intents.GuildMessageReactions,
        Intents.GuildMessageTyping,
        Intents.DirectMessages,
        Intents.DirectMessageReactions,
        Intents.DirectMessageTyping,
        Intents.GuildScheduledEvents
    ],
    prefix: async (bot, msg) => {
        let b = bot as Kaseciak
        let evaluatedPrefix = b.db.getData("/guilds")[msg.guildId ?? ""]?.prefix || process.env.DEF_PREFIX
        return evaluatedPrefix
    }
})

let statusLoop = bot.loop(async () => {
    //@ts-ignore: Property 'player' does not exist on type 'Bot'.
    const player: Player = bot.player

    const shuffledQueues: Queue[] = shuffle(Array.from(player.queues)
        .map((q: [unknown, Queue]) => q[1]))

    if (!shuffledQueues.length)
        return bot.user?.setActivity()

    let track: Track | null = null
    for (const queue of shuffledQueues) {
        if (queue.current) {
            track = queue.current
            break
        }
    }

    if (track)
        bot.user?.setActivity({
            name: track.title,
            url: track.url,
            type: ActivityType.Listening
        })
    else
        bot.user?.setActivity()

}, { seconds: 20 })

statusLoop.on("error", err => {
    console.error("statusLoop error:", err)
})

bot.once("ready", () => {
    console.log("Ready!")
    statusLoop.start()
})

bot.on("checkError", async (ctx, err) => {
    if (!(err instanceof Error)) return
    if (err.message.includes("isConnectedToVoiceChannel")) {
        await ctx.send("Musisz być na kanale głosowym aby użyć tej komendy")
    } else if (err.message.includes("isAdmin")) {
        await ctx.send("Musisz być administratorem aby użyć tej komendy")
    } else
        console.log("checkError: " + err.message)
})

bot.on("commandNotFound", async (msg: Message, command: string, args: string[]) => {
    await msg.channel.send(`Nie znam komendy ${command}`)
})

bot.on("error", err => console.log(err))
bot.on("shardError", err => console.log(err))

bot.on("commandError", async (ctx, err) => {
    console.error(err)
})

export default bot
