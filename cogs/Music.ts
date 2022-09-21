import { Message, MessageEmbed, GuildChannelResolvable, UserResolvable, TextChannel, HexColorString, GuildMember } from "discord.js"
import { Queue, Player, PlayerSearchResult } from "discord-player"
import { Bot, RawCog } from "discord.js-ext"
import { Kaseciak } from "../main"
import MediaController, { CustomMetadata } from "../modules/MediaController"
import ytMusic from "../modules/ytMusicToTracks"
import { EmbedBook } from "../modules/EmbedBook"
import getColor from "../modules/getColor"
// @ts-ignore: Could not find a declaration file for module 'lyrics-finder'
import getLyrics from "lyrics-finder"

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

const cog: RawCog = {
    name: "Music",
    init(bot) {
        bot.on("voiceStateUpdate", async (oldState, newState) => {
            if (oldState.id != bot.user?.id || newState.channel)
                return

            const player = (bot as Kaseciak).player

            const queue = player.getQueue<CustomMetadata>(newState.guild.id)

            if (!queue) return
            queue.destroy(true)

            if (queue.metadata?.mc)
                await queue.metadata.mc.delete()
        })
    },
    isConnectedToVoiceChannel: {
        global: true,
        check(ctx, args) {
            return Boolean(ctx.message.member?.voice.channel)
        }
    },
    play: {
        aliases: ["p"],
        description: "Odtwarza lub dodaje do kolejki podaną piosenkę/playlistę\nFlagi:\n`-n` dodaje piosenkę na początek playlisty\n`-nytm` Używa domyślnej wyszukiwarki a nie yt musicowej",
        usage: "play {piosenka|link do playlisty} {flagi}",
        async command(ctx, args) {
            if (!ctx.message.guild) return

            const player = (ctx.bot as Kaseciak).player

            const queue = player.createQueue(ctx.message.guild, {
                metadata: {
                    channel: ctx.channel
                },
                leaveOnEnd: false,
                leaveOnStop: false,
                bufferingTimeout: 500
            })

            if (await joinVC(ctx.message, queue) == false)
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
                searchResult = await ytMusic(query, player, ctx.message.member as UserResolvable)

            if (!searchResult.tracks?.length)
                searchResult = await player.search(query, {
                    requestedBy: ctx.message.member as GuildMember
                })

            const playlist = searchResult.playlist

            if (playlist) {
                const tracks = playlist.tracks

                const emb = new MessageEmbed()
                    .setTitle(`Dodaję **${tracks.length}** utworów z **${playlist.title}**`)
                    .setURL(playlist.url)
                    .setThumbnail(playlist.thumbnail)
                    .setDescription(playlist.author.name)

                const color = await getColor(playlist.thumbnail, 500, playlist.id)
                if (color)
                    emb.setColor(color as HexColorString)

                await ctx.send({ embeds: [emb] })

                await queue.play(tracks.shift())
                queue.addTracks(tracks)

            } else if (searchResult?.tracks[0]) {
                const track = searchResult.tracks[0]

                const emb = new MessageEmbed()
                    .setTitle(`Dodaję **${track.title}**`)
                    .setURL(track.url)
                    .setThumbnail(track.thumbnail)
                    .setDescription(track.author)

                const color = await getColor(track.thumbnail, 500, track.id)
                if (color)
                    emb.setColor(color as HexColorString)

                await ctx.send({ embeds: [emb] })

                if (playNext)
                    queue.insert(track)
                else
                    await queue.play(track)

            } else
                await ctx.send(`❌ | Nie znalazłem piosenki **${query}**!`)
        }
    },
    skip: {
        aliases: ["s"],
        description: "Skipuje obecną lub kilka piosenek",
        usage: "skip {ilość:opcjonalne}",
        async command(ctx, args) {
            if (!ctx.message.guild) return

            const player = (ctx.bot as Kaseciak).player
            const queue = player.getQueue(ctx.message.guild.id)

            if (!queue || !queue.playing)
                return ctx.send(`Nie ma czego skipnąć`)

            if (args[0]) {
                let num = parseInt(args[0])
                if (typeof num == "number" && num > 1) {
                    if (num > queue.tracks.length)
                        num = queue.tracks.length
                    queue.skipTo(num - 1)
                    await ctx.send(`Skipuje **${num}** piosenek`)
                    return
                }
            }

            const success = queue.skip()

            await ctx.send(
                success ?
                    `Skipuje **${queue.current.title}**` :
                    `Coś się pokićkało`
            )
        }
    },
    back: {
        aliases: ["prev", "previous"],
        description: "Cofa do poprzedniej piosenki",
        async command(ctx, args) {
            if (!ctx.message.guild) return

            const player = (ctx.bot as Kaseciak).player
            const queue = player.getQueue(ctx.message.guild.id)

            await queue.back()

            await ctx.send("Cofam")
        }
    },
    pause: {
        description: "Pauzuje piosenkę",
        async command(ctx, args) {
            if (!ctx.message.guild) return

            const player = (ctx.bot as Kaseciak).player
            const queue = player.getQueue(ctx.message.guild.id)

            queue.setPaused(true)

            await ctx.send("Pauzuję")
        }
    },
    resume: {
        description: "Kontunuuje odtwarzanie piosenki",
        async command(ctx, args) {
            if (!ctx.message.guild) return

            const player = (ctx.bot as Kaseciak).player
            const queue = player.getQueue(ctx.message.guild.id)

            queue.setPaused(false)

            await ctx.send("Wznawiam")
        }
    },
    seek: {
        description: "przewija piosenkę do konkretnego momentu",
        usage: "seek {sekundy}",
        async command(ctx, args) {
            if (!ctx.message.guild) return

            const player = (ctx.bot as Kaseciak).player
            const queue = player.getQueue(ctx.message.guild.id)

            let secs = parseInt(args[0])

            if (typeof secs != "number")
                return await ctx.send("Podaj sekundy")

            let secsInMs = secs * 1000

            if (await queue.seek(secsInMs))
                await ctx.send(`Przewijam do ${secs} sekund`)
            else
                await ctx.send("Nie zdołałem przewinąć")
        }
    },
    clear: {
        aliases: ["c"],
        description: "Czyści kolejkę",
        async command(ctx, args) {
            if (!ctx.message.guild) return

            const player = (ctx.bot as Kaseciak).player
            const queue = player.getQueue(ctx.message.guild.id)

            queue.clear()

            await ctx.send("Kolejka wyczyszczona 🗑️")
        }
    },
    now: {
        aliases: ["np"],
        description: "Wyświetla obecnie odtwarzaną piosenkę",
        async command(ctx, args) {
            if (!ctx.message.guild) return

            const player = (ctx.bot as Kaseciak).player
            const queue = player.getQueue(ctx.message.guild.id)

            if (!queue?.current)
                return await ctx.send("Nic nie jest odtwarzane")

            const track = queue.current

            const timestamps = queue.getPlayerTimestamp()

            await ctx.send({
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
        async command(ctx, args) {
            if (!ctx.message.guild) return

            const player = (ctx.bot as Kaseciak).player
            const queue = player.getQueue(ctx.message.guild.id)

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
                return await ctx.send("Kolejka jest pusta")

            new EmbedBook({
                pages: embeds,
                channel: ctx.channel as TextChannel,
                bot: ctx.bot
            })
        }
    },
    shuffle: {
        description: "Tasuje kolejkę",
        async command(ctx, args) {
            if (!ctx.message.guild) return

            const player = (ctx.bot as Kaseciak).player
            const queue = player.getQueue(ctx.message.guild.id)

            queue.shuffle()

            await ctx.send("Zshufflowałem piosenki 🔀")
        }
    },
    stop: {
        description: "Zatrzymuje bota i kasuje kolejke",
        async command(ctx, args) {
            if (!ctx.message.guild) return

            const player = (ctx.bot as Kaseciak).player
            const queue = player.getQueue<CustomMetadata>(ctx.message.guild.id)

            queue.destroy(true)

            if (queue.metadata?.mc)
                await queue.metadata.mc.delete()

            await ctx.send("Zatrzymuje i kasuje kolejke")
        }
    },
    player: {
        description: "Wysyła lub usuwa wiadomość będącą cały czas na dole kanału którą można obsługiwać podstawowe funkcje odtwarzania:\n🔀 odpowiednik komendy shuffle\n⏪ odpowiednik komendy back\n ⏯️ pauzuje lub wznawia odtwarzanie\n ⏩ odpowiednik komendy skip\n 🔄 odświeża informacje",
        async command(ctx, args) {
            if (!ctx.message.guild) return

            const player = (ctx.bot as Kaseciak).player
            const queue = player.getQueue<CustomMetadata>(ctx.message.guild.id)

            if (!queue)
                return await ctx.send("kolejka nie istnieje")

            if (!queue.metadata) return

            if (queue.metadata.mc)
                await queue.metadata.mc.delete()

            queue.metadata.mc =
                queue.metadata.mc ?
                    undefined :
                    await new MediaController(ctx.channel as TextChannel, player, 5000, true).create()

        }
    },
    lyrics: {
        aliases: ["l", "tekst"],
        description: "Wyszukuje tekst piosenki",
        async command(ctx, args) {
            if (!ctx.message.guild) return

            let query = args.join(" ")

            if (!query.trim()) {
                const player = (ctx.bot as Kaseciak).player
                const queue = player.getQueue<CustomMetadata>(ctx.message.guild.id)
                if (!queue?.current)
                    return await ctx.send("Nic nie jest odtwarzane")
                query = `${queue.current.title} ${queue.current.author}`
            }

            let lyrics: string | undefined = await getLyrics(query)

            if (!lyrics) return await ctx.send("Nie znalazłem tekstu")

            await ctx.send({
                embeds: [
                    new MessageEmbed()
                        .setTitle("Wyniki zapytania: " + query)
                        .setDescription(lyrics)
                ]
            })
        }
    }
}

export function setup(bot: Bot) {
    bot.addCog(cog)
}
