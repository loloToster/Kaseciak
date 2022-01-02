process.title = "KaseciakNode"

import dotenv from "dotenv"
dotenv.config()

import bot from "./config/bot_setup"

//@ts-ignore: Property 'player' does not exist on type 'Bot'.
bot.player = require("./config/player_setup")(bot)

bot.loadCogsFromDir(__dirname + "/cogs", "ts")

bot.login(process.env.TOKEN)
