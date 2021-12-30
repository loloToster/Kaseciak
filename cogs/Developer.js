const { Client, Message } = require("discord.js")

module.exports = {
    exit: {
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Client} client
         */
        async execute(msg, args, client) {
            if (msg.author.id == process.env.OWNER)
                process.exit(0)
        }
    }
}
