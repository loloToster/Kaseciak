import { CommandInteraction } from "discord.js"
import {
  ArgSplitter,
  SimpleCommand,
  SimpleCommandMessage,
  Slash
} from "discordx"
import { MethodDecoratorEx } from "@discordx/internal"

export interface DualCommandOptions {
  name?: any
  aliases?: string[]
  description: string
  argSplitter?: ArgSplitter
}

export function getReplyHandler(
  interactionOrMsg: CommandInteraction | SimpleCommandMessage
) {
  return interactionOrMsg instanceof CommandInteraction
    ? interactionOrMsg
    : interactionOrMsg.message
}
export function getUser(
  interactionOrMsg: CommandInteraction | SimpleCommandMessage
) {
  return interactionOrMsg instanceof CommandInteraction
    ? interactionOrMsg.user
    : interactionOrMsg.message.author
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
    target[propertyKey] = async function (...args: any[]) {
      try {
        await target[propertyKey].apply(this, args)
      } catch (err) {
        console.error(err)
      }
    }

    Slash(options)(target, propertyKey, descriptor)
    SimpleCommand(options)(target, propertyKey, descriptor)
  }
}
