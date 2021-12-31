const { Client, Message } = require("discord.js")

module.exports = {
    exit: {
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Client} bot
         */
        async execute(msg, args, bot) {
            if (msg.author.id == process.env.OWNER)
                process.exit(0)
        }
    }
}
