import { CommandInteraction } from "discord.js"
import { GuardFunction, SimpleCommandMessage } from "discordx"

import { getReplyHandler } from "../utils/DualCommand"

const isGuild: GuardFunction = async (
  interactionOrMsg: CommandInteraction | SimpleCommandMessage,
  client,
  next
) => {
  const replyHandler = getReplyHandler(interactionOrMsg)

  if (replyHandler.guild) {
    next()
  } else {
    await replyHandler.reply("Ta komenda może być użyta tylko na serwerze")
  }
}

export default isGuild
