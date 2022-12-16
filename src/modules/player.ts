import { inject, singleton } from "tsyringe"
import { Player as DiscordPlayer } from "discord-player"
import { Client } from "discordx"
import { GuildMember, GuildResolvable } from "discord.js"

@singleton()
export class Player extends DiscordPlayer {
  constructor(@inject("client") client: Client) {
    super(client, { ytdlOptions: { quality: "lowestaudio" } })
  }

  createDefaultQueue(guild: GuildResolvable) {
    return super.createQueue(guild, {
      leaveOnEnd: false,
      leaveOnStop: false,
      leaveOnEmptyCooldown: 5 * 60 * 1000,
      bufferingTimeout: 500
    })
  }

  async joinVC(
    member: GuildMember | null | undefined,
    guild: GuildResolvable | undefined
  ) {
    if (!member || !guild || !member.voice.channelId) return false

    const queue = this.getQueue(guild)
    if (!queue) return false

    try {
      if (!queue.connection) await queue.connect(member.voice.channelId)
      return true
    } catch {
      queue.destroy()
    }

    return false
  }
}
