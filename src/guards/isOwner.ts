import { CommandInteraction } from "discord.js"
import { GuardFunction, SimpleCommandMessage } from "discordx"

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

export default isOwner
