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
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Client} client
         */
        async execute(msg, args, client) {
            /**@type {Player} */
            const player = client.player
            const queue = player.getQueue(msg.guild.id)

            if (!queue || !queue.previousTracks[1])
                return msg.channel.send(`Nie ma czego cofnąć`)

            await queue.back()

            await msg.channel.send("Cofam")
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
