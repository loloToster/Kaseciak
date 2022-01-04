process.title = "KaseciakNode"

import dotenv from "dotenv"
dotenv.config()

import bot from "./config/bot_setup"
import playerSetup from "./config/player_setup"

//@ts-ignore: Property 'player' does not exist on type 'Bot'.
bot.player = playerSetup(bot)

bot.loadCogsFromDir(__dirname + "/cogs", "ts")

bot.login(process.env.TOKEN)
