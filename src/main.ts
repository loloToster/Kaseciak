import dotenv from "dotenv"

import type { Interaction, Message } from "discord.js"
import { IntentsBitField } from "discord.js"

import { dirname, importx } from "@discordx/importer"
import { Client } from "discordx"

dotenv.config()

export const bot = new Client({
  // Discord intents
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildVoiceStates
  ],

  // Debug logs are disabled in silent mode
  silent: false,

  // Configuration for @SimpleCommand
  simpleCommand: {
    prefix: "!"
  }
})

bot.once("ready", async () => {
  // Synchronize applications commands with Discord
  await bot.initApplicationCommands()

  console.log("Bot started")
})

bot.on("interactionCreate", (interaction: Interaction) => {
  bot.executeInteraction(interaction)
})

bot.on("messageCreate", (message: Message) => {
  bot.executeCommand(message)
})

async function run() {
  await importx(`${dirname(import.meta.url)}/categories/**/*.{ts,js}`)

  // Let's start the bot
  if (!process.env.TOKEN) {
    throw Error("Could not find TOKEN in your environment")
  }

  // Log in with your bot token
  await bot.login(process.env.TOKEN)
}

run()
