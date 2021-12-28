const { Player } = require("discord-player")

module.exports = {
    play: {
        async execute(msg, args, client) {
            /**@type {Player} */
            const player = client.player

            const queue = player.createQueue(msg.guild, {
                metadata: {
                    channel: msg.channel
                }
            })
            try {
                if (!queue.connection) await queue.connect(msg.member.voice.channel)
            } catch {
                queue.destroy()
                return await msg.reply({ content: "Could not join your voice channel!", ephemeral: true })
            }

            let query = args.join(" ")

            const track = await player.search(query, {
                requestedBy: msg.member
            }).then(x => x.tracks[0])

            if (!track)
                return await msg.channel.send(`❌ | Track **${query}** not found!`)

            queue.play(track)

            await msg.channel.send(`⏱️ | Loading track **${track.title}**!`)
        }
    }
}
