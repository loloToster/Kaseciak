const { Player, Queue } = require("discord-player")

module.exports = (bot) => {
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

    return player
}
