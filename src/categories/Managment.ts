import { injectable } from "tsyringe"

import {
  ApplicationCommandOptionType,
  CommandInteraction,
  Message
} from "discord.js"

import {
  Client,
  Discord,
  Guard,
  Once,
  SimpleCommandMessage,
  SimpleCommandOption,
  SimpleCommandOptionType,
  SlashOption
} from "discordx"
import { Category, PermissionGuard } from "@discordx/utilities"
import DualCommand from "../utils/DualCommand"

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

  @DualCommand({ description: "sprawdza czy bot jest uruchomiony" })
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

  @DualCommand({ description: "wyswietla aktualny prefix lub go ustawia" })
  @Guard(PermissionGuard(["Administrator"]))
  async prefix(
    @SimpleCommandOption({
      name: "new-prefix",
      type: SimpleCommandOptionType.String
    })
    @SlashOption({
      name: "new-prefix",
      description: "nowy prefix (brak jeżeli chcesz tylko zobaczyć aktualny)",
      type: ApplicationCommandOptionType.String,
      required: false
    })
      newPrefix: string | undefined,
      interactionOrMsg: CommandInteraction | SimpleCommandMessage
  ) {
    const replyHandler =
      interactionOrMsg instanceof CommandInteraction
        ? interactionOrMsg
        : interactionOrMsg.message

    if (!replyHandler.guildId)
      return await replyHandler.reply(
        "Ta komenda może być używana tylko na serwerze"
      )

    if (!newPrefix) {
      const data = await this.db.getData("/guilds")
      const currentPrefix =
        data[replyHandler.guildId]?.prefix || process.env.DEF_PREFIX

      return await replyHandler.reply(
        `Aktualny prefix to: \`${currentPrefix}\``
      )
    }

    if (newPrefix.length > 1)
      return await replyHandler.reply(
        "Prefix może być tylko pojedynczym znakiem"
      )

    await this.db.push("/guilds", {
      [replyHandler.guildId]: { prefix: newPrefix }
    })

    await replyHandler.reply(`Nowy prefix to: \`${newPrefix}\``)
  }
}
