import { injectable } from "tsyringe"

import {
  ApplicationCommandOptionType,
  CommandInteraction,
  EmbedBuilder,
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
import DualCommand, { getReplyHandler } from "../utils/DualCommand"

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
    const replyHandler = getReplyHandler(interactionOrMsg)

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
    const replyHandler = getReplyHandler(interactionOrMsg)

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

  @DualCommand({ description: "wyswietla opisy komend i kategorii" })
  async help(
    @SimpleCommandOption({
      name: "command",
      type: SimpleCommandOptionType.String
    })
    @SlashOption({
      name: "command",
      description: "po podaniu wyświetla opis danej komendy",
      type: ApplicationCommandOptionType.String,
      required: false
    })
      command: string | undefined,
      interactionOrMsg: CommandInteraction | SimpleCommandMessage,
      client: Client
  ) {
    const replyHandler = getReplyHandler(interactionOrMsg)

    const emb = new EmbedBuilder()

    if (command) {
      const targetCmd = client.applicationCommands.find(
        cmd => cmd.name === command
      )

      targetCmd?.options[0].name

      if (!targetCmd) {
        await replyHandler.reply(`Komenda ${command} nie istnieje`)
        return
      }

      const usage = targetCmd.options.map(opt => `{${opt.name}}`).join(" ")

      emb.setTitle(`${targetCmd.discord.name} > ${targetCmd.name}:`).addFields([
        {
          name: "Opis:",
          value: targetCmd.description || "Ta komenda nie ma opisu"
        },
        {
          name: "Używanie:",
          value: "```\n" + `/${targetCmd.name} ${usage}` + "\n```"
        }
      ])
    } else {
      for (const category of client.discords) {
        emb.addFields({
          name: `**${category.name}:**`,
          value: category.applicationCommands.reduce((acc, cur) => {
            return acc + `- ${cur.name}\n`
          }, ""),
          inline: false
        })
      }

      emb.setFooter({ text: "/help {nazwa komendy}" })
    }

    await replyHandler.reply({ embeds: [emb] })
  }
}
