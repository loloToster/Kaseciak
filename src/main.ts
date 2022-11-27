process.title = "KaseciakNode"

import { readdirSync } from "fs"
import dotenv from "dotenv"
dotenv.config()

import rawBot from "./config/bot_setup"
import playerSetup from "./config/player_setup"
import db from "./config/db_setup"

import { Bot } from "discord.js-ext"
import { Player } from "discord-player"
import { JsonDB } from "node-json-db"

export interface Kaseciak extends Bot {
    player: Player,
    db: JsonDB
}

const bot = rawBot as Kaseciak
bot.player = playerSetup(bot)
bot.db = db

let cogsDir = __dirname + "/cogs"

readdirSync(cogsDir).forEach(file => {
    if (file.match(/\.(js|ts)$/)) bot.loadExtension(`${cogsDir}/${file}`)
})

bot.login(process.env.TOKEN)
