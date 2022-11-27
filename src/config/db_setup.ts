import { JsonDB } from "node-json-db"
import { existsSync } from "fs"

const dbPath = existsSync(`${__dirname}/../../data`) ?
    `${__dirname}/../../data/db.json` : `${__dirname}/../../db.json`

const db = new JsonDB(dbPath)

db.push("/guilds", {}, false)

export default db
