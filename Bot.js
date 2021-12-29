const { Client } = require("discord.js")
const { readdirSync } = require("fs")

class Bot extends Client {
    constructor() {
        super(...arguments)
        this.cogs = {}
    }

    loadCogsFromDir(dir) {
        readdirSync(dir).forEach(file => {
            if (!file.endsWith(".js")) return
            let cogName = file.slice(0, -3)
            let cog = require(`${dir}/${cogName}`)
            let commands = []
            for (const cmdName in cog) {
                let cmd = cog[cmdName]
                if (typeof cmd.execute != "function") continue
                cmd.name = cmdName
                cmd.cog = cogName
                cmd.aliases = cmd.aliases || []
                cmd.description = cmd.description || null
                cmd.usage = cmd.usage || null
                commands.push(cmd)
            }
            this.cogs[cogName] = {}
            this.cogs[cogName].commands = commands
        })
    }

    getCommand(name) {
        for (const cog in this.cogs) {
            for (const cmd of this.cogs[cog].commands) {
                if (name == cmd.name || cmd.aliases.includes(name)) {
                    return cmd
                }
            }
        }
        return false
    }

    async executeCommand(msg, cmdName, args) {
        const cmd = this.getCommand(cmdName)
        if (!cmd) return false
        try {
            await cmd.execute(msg, args, this)
        } catch (err) {
            console.error(err)
        }
        return true
    }
}

module.exports = Bot
