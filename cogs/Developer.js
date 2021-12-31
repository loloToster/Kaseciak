const { Message } = require("discord.js")
const Bot = require("../modules/Bot")

module.exports = {
    exit: {
        /**
         * @param {Message} msg 
         * @param {String[]} args 
         * @param {Bot} bot
         */
        async execute(msg, args, bot) {
            if (msg.author.id == process.env.OWNER)
                process.exit(0)
        }
    }
}
