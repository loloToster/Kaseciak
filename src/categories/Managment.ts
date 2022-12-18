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

import isGuild from "../guards/isGuild"
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

  @DualCommand({ description: "Checks whether the bot is running" })
  async ping(
    interactionOrMsg: CommandInteraction | SimpleCommandMessage,
    client: Client
  ) {
    const replyHandler = getReplyHandler(interactionOrMsg)

    await replyHandler.reply(`Pong! \`${client.ws.ping}ms\``)
  }

  @DualCommand({ description: "Shows current prefix or sets it" })
  @Guard(isGuild, PermissionGuard(["Administrator"]))
  async prefix(
    @SimpleCommandOption({
      name: "new-prefix",
      type: SimpleCommandOptionType.String
    })
    @SlashOption({
      name: "new-prefix",
      description: "new prefix (none to show current)",
      type: ApplicationCommandOptionType.String,
      required: false
    })
      newPrefix: string | undefined,
      interactionOrMsg: CommandInteraction | SimpleCommandMessage
  ) {
    const replyHandler = getReplyHandler(interactionOrMsg)
    const guildId = replyHandler.guild!.id

    if (!newPrefix) {
      const data = await this.db.getData("/guilds")
      const currentPrefix = data[guildId]?.prefix || process.env.DEF_PREFIX

      return await replyHandler.reply(`Current prefix is: \`${currentPrefix}\``)
    }

    if (newPrefix.length > 1)
      return await replyHandler.reply("Prefix can only be a single character")

    await this.db.push("/guilds", {
      [guildId]: { prefix: newPrefix }
    })

    await replyHandler.reply(`Setting prefix to: \`${newPrefix}\``)
  }

  @DualCommand({ description: "Shows description of command or categories" })
  async help(
    @SimpleCommandOption({
      name: "command",
      type: SimpleCommandOptionType.String
    })
    @SlashOption({
      name: "command",
      description: "command that should be described",
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
        await replyHandler.reply(`Command ${command} does not exist`)
        return
      }

      const usage = targetCmd.options.map(opt => `{${opt.name}}`).join(" ")

      emb.setTitle(`${targetCmd.discord.name} > ${targetCmd.name}:`).addFields([
        {
          name: "Description:",
          value:
            targetCmd.description || "This command does not have a description"
        },
        {
          name: "Usage:",
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

      emb.setFooter({ text: "/help {command name}" })
    }

    await replyHandler.reply({ embeds: [emb] })
  }
}
