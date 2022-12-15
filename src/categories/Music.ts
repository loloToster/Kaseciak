import { Discord } from "discordx"
import { Category } from "@discordx/utilities"
import { injectable } from "tsyringe"

import { Player } from "../modules/player"

@Discord()
@injectable()
@Category("Music")
export class Music {
  constructor(private player: Player) {}
}
