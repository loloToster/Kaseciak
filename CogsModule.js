const { Client } = require("discord.js")
const { readdirSync } = require("fs")

/**
 * @param {Client} client 
 */
module.exports = client => {

    client.cogs = {}
    client.commands = []

    client.loadCogsFromDir = function (dir) {
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
                commands.push(cmd)
            }
            this.cogs[cogName] = {}
            this.cogs[cogName].commands = commands
            this.commands = this.commands.concat(commands)
        })
    }

    client.getCommand = function (name) {
        for (const cog in this.cogs) {
            for (const cmd of this.cogs[cog].commands) {
                if (name == cmd.name || cmd.aliases.includes(name)) {
                    return cmd
                }
            }
        }
        return false
    }

    client.executeCommand = async function (msg, cmdName, args) {
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
