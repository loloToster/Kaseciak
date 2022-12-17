import { inject, singleton } from "tsyringe"
import { Player as DiscordPlayer, Queue } from "discord-player"
import { Client } from "discordx"
import { GuildMember, GuildResolvable } from "discord.js"

import MusicController from "../utils/MusicController"

export interface CustomMetadata {
  musiccontroller?: MusicController<CustomMetadata>
}

@singleton()
export class Player extends DiscordPlayer {
  constructor(@inject("client") client: Client) {
    super(client, { ytdlOptions: { quality: "lowestaudio" } })
  }

  getQueue<T = CustomMetadata>(guild: GuildResolvable): Queue<T> | undefined {
    return super.getQueue(guild)
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
