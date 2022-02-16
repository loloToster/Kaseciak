process.title = "KaseciakNode"

import { readdirSync } from "fs"
import dotenv from "dotenv"
dotenv.config()

import bot from "./config/bot_setup"
import playerSetup from "./config/player_setup"

//@ts-ignore: Property 'player' does not exist on type 'Bot'.
bot.player = playerSetup(bot)

let cogsDir = __dirname + "/cogs"

readdirSync(cogsDir).forEach(file => {
    if (file.endsWith(".ts")) bot.loadExtension(`${cogsDir}/${file}`)
})

bot.login(process.env.TOKEN)
