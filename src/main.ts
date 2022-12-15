import dotenv from "dotenv"

import type { Interaction, Message } from "discord.js"
import { IntentsBitField } from "discord.js"

import "reflect-metadata"
import { container } from "tsyringe"
import { importx } from "@discordx/importer"
import { Client, DIService, tsyringeDependencyRegistryEngine } from "discordx"

dotenv.config()

export const bot = new Client({
  // Discord intents
  intents: [
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildVoiceStates
  ],

  // Debug logs are disabled in silent mode
  silent: false
})

bot.once("ready", async () => {
  // Synchronize applications commands with Discord
  await bot.initApplicationCommands()

  console.log("Ready!")
})

bot.on("interactionCreate", (interaction: Interaction) => {
  bot.executeInteraction(interaction)
})

bot.on("messageCreate", (msg: Message) => {
  bot.executeCommand(msg)
})

async function main() {
  container.register("client", { useValue: bot })
  DIService.engine = tsyringeDependencyRegistryEngine.setInjector(container)

  await importx(`${__dirname}/categories/**/*.{ts,js}`)

  if (!process.env.TOKEN)
    throw Error("Could not find TOKEN in your environment")

  await bot.login(process.env.TOKEN)
}

main()
