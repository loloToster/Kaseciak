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
      "Musisz być na kanale głosowym aby użyć tej komendy"
    )
  }
}

export default onVoiceChannel
