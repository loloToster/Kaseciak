import {
  ApplicationCommandOptionType,
  CommandInteraction,
  Message
} from "discord.js"

import {
  Client,
  Discord,
  Once,
  SimpleCommand,
  SimpleCommandMessage,
  Slash,
  SlashOption
} from "discordx"

import { injectable } from "tsyringe"
import { Category } from "@discordx/utilities"

import { Database } from "../modules/database"

@Discord()
@injectable()
@Category("Managment")
export class Managment {
  constructor(private db: Database) {}

  @Once({ event: "ready" })
  onReady(_: unknown, client: Client) {
    client.prefix = async (msg: Message) => {
      const data = await this.db.getData("/guilds")
      const evaluatedPrefix =
        data[msg.guildId ?? ""]?.prefix || process.env.DEF_PREFIX

      return evaluatedPrefix
    }
  }

  @SimpleCommand({
    name: "ping",
    description: "sprawdza czy bot jest uruchomiony"
  })
  @Slash({ name: "ping", description: "sprawdza czy bot jest uruchomiony" })
  async ping(
    interactionOrMsg: CommandInteraction | SimpleCommandMessage,
    client: Client
  ) {
    const replyHandler =
      interactionOrMsg instanceof CommandInteraction
        ? interactionOrMsg
        : interactionOrMsg.message

    await replyHandler.reply(`Pong! \`${client.ws.ping}ms\``)
  }

  @Slash({
    name: "prefix",
    description: "wyswietla aktualny prefix lub go ustawia"
  })
  async setPrefix(
    @SlashOption({
      name: "prefix",
      description: "nowy prefix (brak jeżeli chcesz tylko zobaczyć aktualny)",
      type: ApplicationCommandOptionType.String,
      required: false
    })
      newPrefix: string | undefined,
      interaction: CommandInteraction
  ) {
    if (!interaction.guildId)
      return await interaction.reply(
        "Ta komenda może być używana tylko na serwerze"
      )

    if (!newPrefix) {
      const data = await this.db.getData("/guilds")
      const currentPrefix = data[interaction.guildId] || process.env.DEF_PREFIX
      return await interaction.reply(`Aktualny prefix to: \`${currentPrefix}\``)
    }

    if (newPrefix.length > 10)
      return await interaction.reply(
        "Prefix nie może mieć więcej niż 10 znaków"
      )

    await this.db.push("/guilds", {
      [interaction.guildId]: { prefix: newPrefix }
    })

    await interaction.reply(`Nowy prefix to: \`${newPrefix}\``)
  }
}
