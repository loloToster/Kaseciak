module.exports = {
    ping: {
        async execute(msg, args, client) {
            msg.channel.send("Pong!")
        }
    }
}
