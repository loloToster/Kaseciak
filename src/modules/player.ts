import { inject, singleton } from "tsyringe"
import { Player as DiscordPlayer } from "discord-player"
import { Client } from "discordx"

@singleton()
export class Player extends DiscordPlayer {
  constructor(@inject("client") client: Client) {
    super(client, { ytdlOptions: { quality: "lowestaudio" } })
  }
}
