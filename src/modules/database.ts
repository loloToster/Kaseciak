import { singleton } from "tsyringe"
import { Config, JsonDB } from "node-json-db"
import { existsSync } from "fs"

const projectRoot = `${__dirname}/../..`

const dbPath = existsSync(`${projectRoot}/data`)
  ? `${projectRoot}/data/db.json`
  : `${projectRoot}/db.json`

@singleton()
export class Database extends JsonDB {
  constructor() {
    super(new Config(dbPath))

    this.push("/guilds", {}, false)
    this.push("/users", {}, false)
  }
}
