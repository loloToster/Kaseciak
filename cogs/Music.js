const { Client, Message, MessageEmbed } = require("discord.js")
const { Player } = require("discord-player")

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
    play: {
        aliases: ["p"],
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Client} client
         */
        async execute(msg, args, client) {
            /**@type {Player} */
            const player = client.player

            const queue = player.createQueue(msg.guild, {
                metadata: {
                    channel: msg.channel
                },
                leaveOnEnd: false,
                leaveOnStop: false
            })

            if (await joinVC(msg, queue) == false)
                return

            let query = args.join(" ")

            const track = await player.search(query, {
                requestedBy: msg.member
            }).then(x => x.tracks[0])

            if (!track)
                return await msg.channel.send(`❌ | Nie znalazłem piosenki **${query}**!`)

            if (track.playlist) {
                const playlist = track.playlist
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

                queue.addTracks(tracks)

                await queue.play()
            } else {
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
            }
        }
    },
    skip: {
        aliases: ["s"],
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Client} client
         */
        async execute(msg, args, client) {
            /**@type {Player} */
            const player = client.player
            const queue = player.getQueue(msg.guild.id)

            if (!queue || !queue.playing)
                return msg.channel.send(`Nie ma czego skipnąć`)

            if (args[0]) {
                let num = args[0]
                num = parseInt(num)
                if (typeof num == "number" && num > 1) {
                    queue.skipTo(num - 1)
                    await msg.channel.send(`Skipuje **${num}** piosenek`)
                    return
                }
            }

            const success = queue.skip()
            queue.setPaused(false)

            await msg.channel.send(
                success ?
                    `Skipuje **${queue.current.title}**` :
                    `Coś się pokićkało`
            )
        }
    },
    back: {
        aliases: ["prev", "previous"],
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Client} client
         */
        async execute(msg, args, client) {
            /**@type {Player} */
            const player = client.player
            const queue = player.getQueue(msg.guild.id)

            await queue.back()

            await msg.channel.send("Cofam")
        }
    },
    pause: {
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Client} client
         */
        async execute(msg, args, client) {
            /**@type {Player} */
            const player = client.player
            const queue = player.getQueue(msg.guild.id)

            queue.setPaused(true)

            await msg.channel.send("Pauzuję")
        }
    },
    resume: {
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Client} client
         */
        async execute(msg, args, client) {
            /**@type {Player} */
            const player = client.player
            const queue = player.getQueue(msg.guild.id)

            queue.setPaused(false)

            await msg.channel.send("Wznawiam")
        }
    },
    clear: {
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Client} client
         */
        async execute(msg, args, client) {
            /**@type {Player} */
            const player = client.player
            const queue = player.getQueue(msg.guild.id)

            queue.clear()

            await msg.channel.send("Kolejka wyczyszczona 🗑️")
        }
    }
}
