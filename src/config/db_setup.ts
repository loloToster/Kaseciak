import { JsonDB } from "node-json-db"

const db = new JsonDB("db")

db.push("/guilds", {}, false)

export default db
