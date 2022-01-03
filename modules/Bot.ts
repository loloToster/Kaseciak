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

    private async _runner() {
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

type checkFunc = (msg: Message, args: string[], bot: Bot) => Promise<boolean> | boolean

export interface CommandCheck {
    name: string,
    global?: boolean
    check: checkFunc
}

export interface Command {
    cog: string,
    name: string,
    check: string[],
    aliases: string[],
    description: string,
    usage: string,
    execute: (msg: Message, args: string[], bot: Bot) => any
}

export interface Cog {
    init?: (bot: Bot) => any,
    checks: CommandCheck[]
    commands: Command[]
}

type prefix = string | ((bot: Bot, msg: Message) => Promise<string> | string)

export interface BotOptions {
    prefix: prefix
}

export class Bot extends Client {
    cogs: { [name: string]: Cog }
    loops: { [name: string]: Loop }
    prefix: prefix

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

            let result = await this.executeCommand(msg, command ?? "", args)
            if (!result) this.emit("commandNotFound", msg, command, args)
        })
    }

    loadCogsFromDir(dir: string, lang: "ts" | "js") {
        readdirSync(dir).forEach(file => {
            if (!file.endsWith("." + lang)) return
            let cogName = file.slice(0, -3)
            let module = require(`${dir}/${cogName}`)
            let cog: Cog = lang === "ts" ? module.default : module
            let commands: Command[] = []
            for (const cmd of cog.commands) {
                if (typeof cmd.execute != "function") continue
                cmd.cog = cogName
                cmd.check = cmd.check ?? []
                cmd.aliases = cmd.aliases ?? []
                cmd.description = cmd.description ?? ""
                cmd.usage = cmd.usage ?? ""
                commands.push(cmd)
            }
            if (typeof cog.init == "function") cog.init(this)
            this.cogs[cogName] = { commands: commands, checks: cog.checks ?? [] }
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


    /**
     * @returns true if Context passed checks. If it didn't it returns the name of the failed check
     */
    async check(msg: Message, args: string[], cmd: Command): Promise<string | true> {
        for (const check of this.cogs[cmd.cog].checks) {
            if (check.global || cmd.check.includes(check.name)) {
                if (await check.check(msg, args, this))
                    continue
                else return check.name
            }
        }
        return true
    }

    private async executeCommand(msg: Message, cmdName: string, args: string[]) {
        if (!cmdName) return false
        const cmd = this.getCommand(cmdName)
        if (!cmd) return false

        try {
            const check = await this.check(msg, args, cmd)
            if (check !== true)
                throw new Error("Check failed: " + check)
        } catch (err) {
            this.emit("checkError", msg, err)
            return true
        }

        try {
            await cmd.execute(msg, args, this)
        } catch (err) {
            this.emit("commandError", msg, cmdName, err)
        }

        return true
    }

    loop(name: string, action: Function, interval: number) {
        this.loops[name] = new Loop(this, name, action, interval)
    }
}
