import { injectable } from "tsyringe"
import { CommandInteraction } from "discord.js"
import { Discord, Guard, SimpleCommandMessage } from "discordx"
import { Category } from "@discordx/utilities"
import DualCommand, { getReplyHandler } from "../utils/DualCommand"

import isOwner from "../guards/isOwner"
import { Database } from "../modules/database"

@Discord()
@injectable()
@Category("Developer")
@Guard(isOwner)
export class Developer {
  constructor(private db: Database) {}

  @DualCommand({ description: "Exites the bot process" })
  async exit(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler = getReplyHandler(interactionOrMsg)

    try {
      await replyHandler.reply("Exiting...")
    } finally {
      process.exit(0)
    }
  }

  @DualCommand({ name: "reload-db", description: "Reloads the db" })
  async reloadDb(interactionOrMsg: CommandInteraction | SimpleCommandMessage) {
    const replyHandler = getReplyHandler(interactionOrMsg)

    await this.db.reload()

    await replyHandler.reply("db reloaded!")
  }
}
