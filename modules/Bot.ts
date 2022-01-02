import { Client, ClientOptions, Message } from "discord.js"
import { readdirSync } from "fs"

export class Loop {
    bot: Bot
    name: string
    action: Function
    ms: number
    private timeout: null | NodeJS.Timeout

    constructor(bot: Bot, name: string, action: Function, ms: number) {
        this.bot = bot
        this.name = name
        this.action = action
        this.ms = ms
        this.timeout = null
    }

    start() {
        this._runner()
    }

    stop() {
        if (this.timeout)
            clearTimeout(this.timeout)
        this.timeout = null
    }

    isRunning() {
        return new Boolean(this.timeout)
    }

    async _runner() {
        try {
            const shouldContinue = await this.action()
            if (shouldContinue === false) return this.stop()
        } catch (e) {
            console.log(e)
            this.bot.emit("loopError", this.name, e)
        }
        this.timeout = setTimeout(this._runner.bind(this), this.ms)
    }
}

export interface Command {
    cog?: string,
    name: string,
    aliases?: string[],
    description?: string,
    usage?: string,
    execute: (msg: Message, args: string[], bot: Bot) => any
}

export interface Cog {
    _init?: ((bot: Bot) => any),
    commands: Command[]
}

export interface BotOptions {
    prefix: string | Function
}

export class Bot extends Client {
    cogs: { [key: string]: Cog }
    loops: { [key: string]: Loop }
    prefix: string | Function

    constructor(options: ClientOptions, botOptions: BotOptions) {
        super(options)

        this.cogs = {}
        this.loops = {}
        this.prefix = botOptions.prefix

        this.on("messageCreate", async msg => {
            let content = msg.content

            const prefix = typeof this.prefix == "function" ?
                await this.prefix(this, msg) : this.prefix

            if (!content.startsWith(prefix)) return

            content = content.substring(prefix.length)

            let args = content.split(/ +/g)
            let command = args.shift()

            let result = await this.executeCommand(msg, command || "", args)
            if (!result) this.emit("commandNotFound", msg, command, args)
        })
    }

    loadCogsFromDir(dir: string, lang: "ts" | "js") {
        readdirSync(dir).forEach(file => {
            if (!file.endsWith("." + lang)) return
            let cogName = file.slice(0, -3)
            let cog: Cog = require(`${dir}/${cogName}`).default
            let commands: Command[] = []
            for (const cmd of cog.commands) {
                if (typeof cmd.execute != "function") continue
                cmd.cog = cogName
                cmd.aliases = cmd.aliases || []
                cmd.description = cmd.description || ""
                cmd.usage = cmd.usage || ""
                commands.push(cmd)
            }
            if (typeof cog._init == "function") cog._init(this)
            this.cogs[cogName] = { commands: commands }
        })
    }

    getCommand(name: string) {
        for (const cog in this.cogs) {
            for (const cmd of this.cogs[cog].commands) {
                if (!cmd.aliases) continue
                if (name == cmd.name || cmd.aliases.includes(name)) {
                    return cmd
                }
            }
        }
        return false
    }

    async executeCommand(msg: Message, cmdName: string, args: string[]) {
        if (!cmdName) return false
        const cmd = this.getCommand(cmdName)
        if (!cmd) return false
        try {
            await cmd.execute(msg, args, this)
        } catch (err) {
            this.emit("commandError", msg, err)
        }
        return true
    }

    loop(name: string, action: Function, interval: number) {
        this.loops[name] = new Loop(this, name, action, interval)
    }
}
