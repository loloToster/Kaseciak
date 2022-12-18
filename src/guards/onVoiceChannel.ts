import { CommandInteraction } from "discord.js"
import { GuardFunction, SimpleCommandMessage } from "discordx"

import { getMember, getReplyHandler } from "../utils/DualCommand"

const onVoiceChannel: GuardFunction = async (
  interactionOrMsg: CommandInteraction | SimpleCommandMessage,
  client,
  next
) => {
  const replyHandler = getReplyHandler(interactionOrMsg)
  const member = getMember(interactionOrMsg)

  if (member?.voice.channel) {
    next()
  } else {
    await replyHandler.reply(
      "You have to be on a voice channel to use this command"
    )
  }
}

export default onVoiceChannel
