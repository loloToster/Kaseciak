process.title = "KaseciakNode"
require("dotenv").config()

const bot = require("./config/bot_setup")

bot.player = require("./config/player_setup")(bot)

bot.loadCogsFromDir(__dirname + "/cogs")

bot.login(process.env.TOKEN)
