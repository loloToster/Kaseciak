import { MethodDecoratorEx } from "@discordx/internal"
import { SimpleCommand, Slash } from "discordx"

export interface DualCommandOptions {
  name?: any
  description: string
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
