import { CommandInteraction } from "discord.js"
import { injectable } from "tsyringe"
import { Client, Discord, Slash } from "discordx"
import { Category } from "@discordx/utilities"

import { Database } from "../modules/database"

@Discord()
@injectable()
@Category("Managment")
export class Managment {
  constructor(private db: Database) {}

  @Slash({ name: "ping", description: "sprawdza czy bot jest uruchomiony" })
  async ping(interaction: CommandInteraction, client: Client) {
    await interaction.reply(`Pong! \`${client.ws.ping}ms\``)
  }
}
