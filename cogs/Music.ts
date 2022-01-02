import { Message, MessageEmbed, GuildChannelResolvable, UserResolvable, TextChannel } from "discord.js"
import { Queue, Player, PlayerSearchResult } from "discord-player"
import { Bot } from "../modules/Bot"
import MediaController from "../modules/MediaController"
import ytMusic from "../modules/ytMusicToTracks"
import { EmbedBook } from "../modules/EmbedBook"

// https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url
function isValidUrl(s: string) {
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
async function joinVC(msg: Message, queue: Queue) {
    if (!msg.member) return false
    try {
        if (!queue.connection) await queue.connect(msg.member.voice.channel as GuildChannelResolvable)
        return true
    } catch {
        queue.destroy()
        await msg.channel.send("Nie mogę wejść na kanał!")
    }
    return false
}

export default {
    _init: (bot: Bot) => {
        bot.on("voiceStateUpdate", async (oldState, newState) => {
            if (oldState.id != bot.user?.id || newState.channel)
                return

            //@ts-ignore: Property 'player' does not exist on type 'Bot'.
            const player: Player = bot.player

            const queue = player.getQueue(newState.guild.id)

            if (!queue) return
            queue.destroy(true)
            // @ts-ignore: Object is of type 'unknown'.
            if (queue.metadata.mc) await queue.metadata.mc.delete()
        })
    },
    commands: [
        {
            name: "play",
            aliases: ["p"],
            description: "Odtwarza lub dodaje do kolejki podaną piosenkę/playlistę\nFlagi:\n`-n` dodaje piosenkę na początek playlisty\n`-nytm` Używa domyślnej wyszukiwarki a nie yt musicowej",
            usage: "play {piosenka|link do playlisty} {flagi}",
            async execute(msg: Message, args: string[], bot: Bot) {
                if (!msg.guild) return

                //@ts-ignore: Property 'player' does not exist on type 'Bot'.
                const player: Player = bot.player

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

                let playNext = false
                let noYTmusic = false

                // process flags:
                for (let i = args.length - 1; i >= 0; i--) {
                    const arg = args[i]
                    if (arg.startsWith("-")) {
                        const flag = args.pop()?.substring(1)
                        if (flag == "n") playNext = true
                        else if (flag == "nytm") noYTmusic = true
                    } else break
                }

                let query = args.join(" ")

                let searchResult: PlayerSearchResult = { tracks: [], playlist: null }

                if (!isValidUrl(query) && !noYTmusic)
                    searchResult = await ytMusic(query, player, msg.member as UserResolvable)

                if (!searchResult.tracks?.length)
                    searchResult = await player.search(query, {
                        // @ts-ignore: Type 'null' is not assignable to type 'User'.
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

                    if (playNext)
                        queue.insert(track)
                    else
                        await queue.play(track)

                } else
                    await msg.channel.send(`❌ | Nie znalazłem piosenki **${query}**!`)
            }
        },
        {
            name: "skip",
            aliases: ["s"],
            description: "Skipuje obecną lub kilka piosenek",
            usage: "skip {ilość:opcjonalne}",
            async execute(msg: Message, args: string[], bot: Bot) {
                if (!msg.guild) return

                //@ts-ignore: Property 'player' does not exist on type 'Bot'.
                const player: Player = bot.player
                const queue = player.getQueue(msg.guild.id)

                if (!queue || !queue.playing)
                    return msg.channel.send(`Nie ma czego skipnąć`)

                if (args[0]) {
                    let num = parseInt(args[0])
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
        {
            name: "back",
            aliases: ["prev", "previous"],
            description: "Cofa do poprzedniej piosenki",
            async execute(msg: Message, args: string[], bot: Bot) {
                if (!msg.guild) return

                //@ts-ignore: Property 'player' does not exist on type 'Bot'.
                const player: Player = bot.player
                const queue = player.getQueue(msg.guild.id)

                await queue.back()

                await msg.channel.send("Cofam")
            }
        },
        {
            name: "pause",
            description: "Pauzuje piosenkę",
            async execute(msg: Message, args: string[], bot: Bot) {
                if (!msg.guild) return

                //@ts-ignore: Property 'player' does not exist on type 'Bot'.
                const player: Player = bot.player
                const queue = player.getQueue(msg.guild.id)

                queue.setPaused(true)

                await msg.channel.send("Pauzuję")
            }
        },
        {
            name: "resume",
            description: "Kontunuuje odtwarzanie piosenki",
            async execute(msg: Message, args: string[], bot: Bot) {
                if (!msg.guild) return

                //@ts-ignore: Property 'player' does not exist on type 'Bot'.
                const player: Player = bot.player
                const queue = player.getQueue(msg.guild.id)

                queue.setPaused(false)

                await msg.channel.send("Wznawiam")
            }
        },
        {
            name: "seek",
            description: "przewija piosenkę do konkretnego momentu",
            usage: "seek {sekundy}",
            async execute(msg: Message, args: string[], bot: Bot) {
                if (!msg.guild) return

                //@ts-ignore: Property 'player' does not exist on type 'Bot'.
                const player: Player = bot.player
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
        {
            name: "clear",
            aliases: ["c"],
            description: "Czyści kolejkę",
            async execute(msg: Message, args: string[], bot: Bot) {
                if (!msg.guild) return

                //@ts-ignore: Property 'player' does not exist on type 'Bot'.
                const player: Player = bot.player
                const queue = player.getQueue(msg.guild.id)

                queue.clear()

                await msg.channel.send("Kolejka wyczyszczona 🗑️")
            }
        },
        {
            name: "now",
            aliases: ["np"],
            description: "Wyświetla obecnie odtwarzaną piosenkę",
            async execute(msg: Message, args: string[], bot: Bot) {
                if (!msg.guild) return

                //@ts-ignore: Property 'player' does not exist on type 'Bot'.
                const player: Player = bot.player
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
        {
            name: "queue",
            aliases: ["q"],
            description: "Wyświetla kolejkę",
            async execute(msg: Message, args: string[], bot: Bot) {
                if (!msg.guild) return

                //@ts-ignore: Property 'player' does not exist on type 'Bot'.
                const player: Player = bot.player
                const queue = player.getQueue(msg.guild.id)

                let embeds: MessageEmbed[] = []

                const chunkSize = 10
                const numberOfChunks = Math.ceil(queue.tracks.length / chunkSize)
                for (let i = 0, chunkNumber = 0; i < queue.tracks.length; i += chunkSize, chunkNumber++) {
                    const chunk = queue.tracks.slice(i, i + chunkSize)
                    embeds.push(new MessageEmbed()
                        .setDescription(
                            chunk.map(
                                (track, j) =>
                                    `${chunkNumber * chunkSize + j + 1}. ${track.title} - ${track.author} \`${track.duration}\``
                            ).join("\n")
                        ).setFooter({ text: `Strona ${chunkNumber + 1}/${numberOfChunks}` })
                    )
                }

                if (!embeds.length)
                    return await msg.channel.send("Kolejka jest pusta")

                new EmbedBook({
                    pages: embeds,
                    channel: msg.channel as TextChannel,
                    bot: bot
                })
            }
        },
        {
            name: "shuffle",
            description: "Tasuje kolejkę",
            async execute(msg: Message, args: string[], bot: Bot) {
                if (!msg.guild) return

                //@ts-ignore: Property 'player' does not exist on type 'Bot'.
                const player: Player = bot.player
                const queue = player.getQueue(msg.guild.id)

                queue.shuffle()

                await msg.channel.send("Zshufflowałem piosenki 🔀")
            }
        },
        {
            name: "stop",
            description: "Zatrzymuje bota i kasuje kolejke",
            async execute(msg: Message, args: string[], bot: Bot) {
                if (!msg.guild) return

                //@ts-ignore: Property 'player' does not exist on type 'Bot'.
                const player: Player = bot.player
                const queue = player.getQueue(msg.guild.id)

                queue.destroy(true)
                // @ts-ignore: Object is of type 'unknown'.
                if (queue.metadata.mc) await queue.metadata.mc.delete()

                await msg.channel.send("Zatrzymuje i kasuje kolejke")
            }
        },
        {
            name: "player",
            description: "Wysyła lub usuwa wiadomość będącą cały czas na dole kanału którą można obsługiwać podstawowe funkcje odtwarzania:\n🔀 odpowiednik komendy shuffle\n⏪ odpowiednik komendy back\n ⏯️ pauzuje lub wznawia odtwarzanie\n ⏩ odpowiednik komendy skip\n 🔄 odświeża informacje",
            async execute(msg: Message, args: string[], bot: Bot) {
                if (!msg.guild) return

                //@ts-ignore: Property 'player' does not exist on type 'Bot'.
                const player: Player = bot.player
                const queue = player.getQueue(msg.guild.id)

                if (!queue)
                    return await msg.channel.send("kolejka nie istnieje")

                const metadata: any = queue.metadata

                if (metadata.mc) {
                    await metadata.mc.delete()
                    metadata.mc = undefined
                } else
                    metadata.mc = await new MediaController(msg.channel as TextChannel, player, 5000, true).create()
            }
        }
    ]
}
