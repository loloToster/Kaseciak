import { injectable } from "tsyringe"
import { CommandInteraction } from "discord.js"
import { Discord, Guard, GuardFunction, SimpleCommandMessage } from "discordx"
import { Category } from "@discordx/utilities"
import DualCommand from "../utils/DualCommand"

import { Database } from "../modules/database"

const isOwner: GuardFunction = async (
  interactionOrMsg: CommandInteraction | SimpleCommandMessage,
  client,
  next
) => {
  const authorId =
    interactionOrMsg instanceof CommandInteraction
      ? interactionOrMsg.user.id
      : interactionOrMsg.message.author.id

  await client.application?.fetch()
  if (authorId === client.application?.owner?.id) next()
}

@Discord()
@injectable()
@Category("Developer")
@Guard(isOwner)
export class Developer {
  constructor(private db: Database) {}

  @DualCommand({ description: "exites the bot process" })
  async exit(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler =
      interactionOrMsg instanceof CommandInteraction
        ? interactionOrMsg
        : interactionOrMsg.message

    try {
      await replyHandler.reply("Exiting...")
    } finally {
      process.exit(0)
    }
  }

  @DualCommand({ name: "reload-db", description: "reloads the db" })
  async reloadDb(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler =
      interactionOrMsg instanceof CommandInteraction
        ? interactionOrMsg
        : interactionOrMsg.message

    await this.db.reload()

    await replyHandler.reply("db reloaded!")
  }
}
