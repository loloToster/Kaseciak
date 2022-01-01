const { Message, MessageEmbed } = require("discord.js")
const { Player, Queue } = require("discord-player")
const Bot = require("../modules/Bot")
const MediaController = require("../modules/MediaController")
const ytMusic = require("../modules/ytMusicToTracks")

// https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url
function isValidUrl(s) {
    let url
    try {
        url = new URL(s)
    } catch {
        return false
    }
    return url.protocol == "http:" || url.protocol == "https:"
}

/**
 * @param {Message} msg 
 * @param {Queue} queue 
 */
async function joinVC(msg, queue) {
    try {
        if (!queue.connection) await queue.connect(msg.member.voice.channel)
        return true
    } catch {
        queue.destroy()
        await msg.channel.send("Nie mogę wejść na kanał!")
    }
    return false
}

module.exports = {
    /**
     * @param {Bot} bot
     */
    _init: bot => {
        bot.on("voiceStateUpdate", async (oldState, newState) => {
            if (oldState.id != bot.user.id || newState.channel)
                return

            /**@type {Player} */
            const player = bot.player

            const queue = player.getQueue(newState.guild.id)

            if (!queue) return
            queue.destroy(true)
            if (queue.metadata.mc) await queue.metadata.mc.delete()
        })
    },
    play: {
        aliases: ["p"],
        description: "Odtwarza lub dodaje do kolejki podaną piosenkę",
        usage: "play {piosenka|link do playlisty}",
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Bot} bot
         */
        async execute(msg, args, bot) {
            /**@type {Player} */
            const player = bot.player

            const queue = player.createQueue(msg.guild, {
                metadata: {
                    channel: msg.channel
                },
                leaveOnEnd: false,
                leaveOnStop: false,
                bufferingTimeout: 500
            })

            if (await joinVC(msg, queue) == false)
                return

            if (!args[0]) {
                if (!queue.playing)
                    await queue.play()
                return
            }

            let query = args.join(" ")

            let searchResult = {}

            if (!isValidUrl(query))
                searchResult = await ytMusic(query, player, msg.member)

            if (!searchResult.tracks?.length)
                searchResult = await player.search(query, {
                    requestedBy: msg.member
                })

            const playlist = searchResult.playlist

            if (playlist) {
                const tracks = playlist.tracks
                await msg.channel.send({
                    embeds: [
                        new MessageEmbed()
                            .setTitle(`Dodaję **${tracks.length}** utworów z **${playlist.title}**`)
                            .setURL(playlist.url)
                            .setThumbnail(playlist.thumbnail)
                            .setDescription(playlist.author.name)
                    ]
                })

                await queue.play(tracks.shift())
                queue.addTracks(tracks)

            } else if (searchResult?.tracks[0]) {
                const track = searchResult.tracks[0]
                await msg.channel.send({
                    embeds: [
                        new MessageEmbed()
                            .setTitle(`Dodaję **${track.title}**`)
                            .setURL(track.url)
                            .setThumbnail(track.thumbnail)
                            .setDescription(track.author)
                    ]
                })

                await queue.play(track)

            } else
                await msg.channel.send(`❌ | Nie znalazłem piosenki **${query}**!`)
        }
    },
    skip: {
        aliases: ["s"],
        description: "Skipuje obecną lub kilka piosenek",
        usage: "skip {ilość:opcjonalne}",
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Bot} bot
         */
        async execute(msg, args, bot) {
            /**@type {Player} */
            const player = bot.player
            const queue = player.getQueue(msg.guild.id)

            if (!queue || !queue.playing)
                return msg.channel.send(`Nie ma czego skipnąć`)

            if (args[0]) {
                let num = args[0]
                num = parseInt(num)
                if (typeof num == "number" && num > 1) {
                    if (num > queue.tracks.length)
                        num = queue.tracks.length
                    queue.skipTo(num - 1)
                    await msg.channel.send(`Skipuje **${num}** piosenek`)
                    return
                }
            }

            const success = queue.skip()

            await msg.channel.send(
                success ?
                    `Skipuje **${queue.current.title}**` :
                    `Coś się pokićkało`
            )
        }
    },
    back: {
        aliases: ["prev", "previous"],
        description: "Cofa do poprzedniej piosenki",
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Bot} bot
         */
        async execute(msg, args, bot) {
            /**@type {Player} */
            const player = bot.player
            const queue = player.getQueue(msg.guild.id)

            await queue.back()

            await msg.channel.send("Cofam")
        }
    },
    pause: {
        description: "Pauzuje piosenkę",
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Bot} bot
         */
        async execute(msg, args, bot) {
            /**@type {Player} */
            const player = bot.player
            const queue = player.getQueue(msg.guild.id)

            queue.setPaused(true)

            await msg.channel.send("Pauzuję")
        }
    },
    resume: {
        description: "Kontunuuje odtwarzanie piosenki",
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Bot} bot
         */
        async execute(msg, args, bot) {
            /**@type {Player} */
            const player = bot.player
            const queue = player.getQueue(msg.guild.id)

            queue.setPaused(false)

            await msg.channel.send("Wznawiam")
        }
    },
    seek: {
        description: "przewija piosenkę do konkretnego momentu",
        usage: "seek {sekundy}",
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Bot} bot
         */
        async execute(msg, args, bot) {
            /**@type {Player} */
            const player = bot.player
            const queue = player.getQueue(msg.guild.id)

            let secs = parseInt(args[0])

            if (typeof secs != "number")
                return await msg.channel.send("Podaj sekundy")

            let secsInMs = secs * 1000

            if (await queue.seek(secsInMs))
                await msg.channel.send(`Przewijam do ${secs} sekund`)
            else
                await msg.channel.send("Nie zdołałem przewinąć")
        }
    },
    clear: {
        aliases: ["c"],
        description: "Czyści kolejkę",
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Bot} bot
         */
        async execute(msg, args, bot) {
            /**@type {Player} */
            const player = bot.player
            const queue = player.getQueue(msg.guild.id)

            queue.clear()

            await msg.channel.send("Kolejka wyczyszczona 🗑️")
        }
    },
    now: {
        aliases: ["np"],
        description: "Wyświetla obecnie odtwarzaną piosenkę",
        /**
        * @param {Message} msg 
        * @param {String[]} args 
        * @param {Bot} bot
        */
        async execute(msg, args, bot) {
            /**@type {Player} */
            const player = bot.player
            const queue = player.getQueue(msg.guild.id)

            if (!queue?.current)
                return await msg.channel.send("Nic nie jest odtwarzane")

            const track = queue.current

            const timestamps = queue.getPlayerTimestamp()

            await msg.channel.send({
                embeds: [
                    new MessageEmbed()
                        .setTitle(`**${track.title}**`)
                        .setURL(track.url)
                        .setThumbnail(track.thumbnail)
                        .setDescription(track.author)
                        .addField(
                            "\u2800",
                            `${timestamps.current}┃${queue.createProgressBar({ length: 15 })}┃${timestamps.end}`,
                            true
                        )
                ]
            })
        }
    },
    queue: {
        aliases: ["q"],
        description: "Wyświetla kolejkę",
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Bot} bot
         */
        async execute(msg, args, bot) {
            /**@type {Player} */
            const player = bot.player
            const queue = player.getQueue(msg.guild.id)

            await msg.channel.send(queue.toString())
        }
    },
    shuffle: {
        description: "Tasuje kolejkę",
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Bot} bot
         */
        async execute(msg, args, bot) {
            /**@type {Player} */
            const player = bot.player
            const queue = player.getQueue(msg.guild.id)

            queue.shuffle()

            await msg.channel.send("Zshufflowałem piosenki 🔀")
        }
    },
    stop: {
        description: "Zatrzymuje bota i kasuje kolejke",
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Bot} bot
         */
        async execute(msg, args, bot) {
            /**@type {Player} */
            const player = bot.player
            const queue = player.getQueue(msg.guild.id)

            queue.destroy(true)
            if (queue.metadata.mc) await queue.metadata.mc.delete()

            await msg.channel.send("Zatrzymuje i kasuje kolejke")
        }
    },
    player: {
        description: "Wysyła lub usuwa wiadomość będącą cały czas na dole kanału którą można obsługiwać podstawowe funkcje odtwarzania:\n🔀 odpowiednik komendy shuffle\n⏪ odpowiednik komendy back\n ⏯️ pauzuje lub wznawia odtwarzanie\n ⏩ odpowiednik komendy skip\n 🔄 odświeża informacje",
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Bot} bot
         */
        async execute(msg, args, bot) {
            /**@type {Player} */
            const player = bot.player
            const queue = player.getQueue(msg.guild.id)

            if (!queue)
                return await msg.channel.send("kolejka nie istnieje")

            if (queue.metadata.mc) {
                await queue.metadata.mc.delete()
                queue.metadata.mc = undefined
            } else
                queue.metadata.mc = await new MediaController(msg.channel, player, 5000, true).create()
        }
    }
}
