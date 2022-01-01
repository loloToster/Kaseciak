const { Client, ClientOptions, Message } = require("discord.js")
const { readdirSync } = require("fs")

class Loop {
    constructor(bot, name, action, ms) {
        this.bot = bot
        this.name = name
        this.action = action
        this.ms = ms
        this._timeout = null
    }

    start() {
        this._runner()
    }

    stop() {
        clearTimeout(this._timeout)
        this._timeout = null
    }

    isRunning() {
        return new Boolean(this._timeout)
    }

    async _runner() {
        try {
            const shouldContinue = await this.action()
            if (shouldContinue === false) return this.stop()
        } catch (e) {
            console.log(e)
            this.bot.emit("loopError", this.name, e)
        }
        this._timeout = setTimeout(this._runner.bind(this), this.ms)
    }
}

class Bot extends Client {
    /** @param {ClientOptions} options */
    constructor(options) {
        super(options)

        this.cogs = {}
        this.loops = {}
        this.prefix = options.prefix

        this.on("messageCreate", async msg => {
            let content = msg.content

            const prefix = typeof this.prefix == "function" ?
                await this.prefix(this, msg) : this.prefix

            if (!content.startsWith(prefix)) return

            content = content.substring(prefix.length)

            let args = content.split(/ +/g)
            let command = args.shift()

            let result = await this.executeCommand(msg, command, args)
            if (!result) this.emit("commandNotFound", msg, command, args)
        })
    }

    /**
     * @param {String} dir 
     */
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
            if (typeof cog._init == "function") cog._init(this)
            this.cogs[cogName] = {}
            this.cogs[cogName].commands = commands
        })
    }

    /**
     * @param {String} name 
     * @returns {Object|Boolean} command
     */
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

    /**
     * @param {Message} msg 
     * @param {String} cmdName 
     * @param {String[]} args 
     * @returns {Boolean} command found
     */
    async executeCommand(msg, cmdName, args) {
        const cmd = this.getCommand(cmdName)
        if (!cmd) return false
        try {
            await cmd.execute(msg, args, this)
        } catch (err) {
            this.emit("commandError", msg, err)
        }
        return true
    }

    /**
     * @param {String} name 
     * @param {Function} action 
     * @param {Number} interval
     */
    loop(name, action, interval) {
        this.loops[name] = new Loop(this, name, action, interval)
    }
}

module.exports = Bot
