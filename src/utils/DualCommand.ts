import { CommandInteraction } from "discord.js"
import { SimpleCommand, SimpleCommandMessage, Slash } from "discordx"
import { MethodDecoratorEx } from "@discordx/internal"

export interface DualCommandOptions {
  name?: any
  aliases?: string[]
  description: string
}

export function getReplyHandler(
  interactionOrMsg: CommandInteraction | SimpleCommandMessage
) {
  return interactionOrMsg instanceof CommandInteraction
    ? interactionOrMsg
    : interactionOrMsg.message
}

export function getMember(
  interactionOrMsg: CommandInteraction | SimpleCommandMessage
) {
  const replyHandler = getReplyHandler(interactionOrMsg)

  return replyHandler.guild?.members.cache.get(
    interactionOrMsg instanceof CommandInteraction
      ? interactionOrMsg.member?.user.id || ""
      : interactionOrMsg.message.author.id
  )
}

export default function DualCommand(
  options: DualCommandOptions
): MethodDecoratorEx {
  return (
    target: Record<string, any>,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) => {
    Slash(options)(target, propertyKey, descriptor)
    SimpleCommand(options)(target, propertyKey, descriptor)
  }
}
