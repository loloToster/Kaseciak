<br>
<br>
<p align="center">
<img src="logo.png" alt="kaseciak logo" width="75%">
</p>
<br>

## Features

* 🎵 Play songs from YouTube, Youtube Music, Spotify and more
* 🔍 Search for a song via a query or link
* 🎼 Play playlists from many platforms
* 📻 Listen to music from polish radios like [RMF FM](https://www.rmf.fm/) or [Eska](https://www.eska.pl/)
* 🦾 Full support for slash commands
* <details>
  <summary>📝 All commands (click to show)</summary>
  
    <br>
    Categories:

    * [Music](#music)
    * [Radio](#radio)
    * [Managment](#managment)
    * [Developer](#developer)

    ### Music

    | Name | Options | Description |
    |-|-|-|
    | play | `query:optional` | Plays or adds a song/playlist to the queue |
    | queue |  | Shows the queue |
    | clear |  | Clears the queue |
    | skip | `amount:number:optional` | Skips current or multiple songs |
    | back |  | Rewinds to the previous song |
    | pause |  | Pauses the song |
    | resume |  | Resumes the song |
    | seek | `seconds:number` | Rewinds the song to a specific moment |
    | shuffle |  | Shuffles the queue |
    | stop |  | Stops the bot and deletes the queue |
    | lyrics | `query:optional` | Searches for the lyrics of a song |
    | player |  | Shows or hides the music controller |
    | use-yt-music | `choice:optional` | Choose wheter you want to use yt music to search for songs |

    ### Radio

    | Name | Options | Description |
    |-|-|-|
    | radio | `station:string` | Starts adding songs from the radio or adds a radio station |
    | radio-stop |  | Removes all radios from the queue |

    ### Managment

    | Name | Options | Description |
    |-|-|-|
    | ping |  | Checks whether the bot is running |
    | prefix | `new-prefix:string:optional` | Shows current prefix or sets it |
    | help | `command:string:optional` | Shows description of command or categories |

    ### Developer

    This commands are only available for bot owners

    | Name | Options | Description |
    |-|-|-|
    | exit |  | Exits the nodejs process |
    | reload-db |  | Reloads the db |

</details>

## Requirements

1. Get bot token as shown [here](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot).\
    1.1 Enable "Message Content Intent" in Discord Developer Portal
2. Node.js 16 or newer

## ⚙️ Installation

1. Clone the repo, install packages & build the bot

```bash
git clone https://github.com/loloToster/Kaseciak.git
cd Kaseciak
npm install
npm run build
```
2. Create a file named `.env` and insert following content in it:

```txt
TOKEN="paste your token here"
```

3. Run the bot

```bash
npm start
```

## 🐋 Running with docker

To run this bot using docker you'll have to set an env variable `TOKEN` to the token of your discord bot and mount a volume to `/app/data`. Here is a simple example: 

```
docker run -e TOKEN=*your bot token here* -v ./data:/app/data --name kaseciak -d lolotoster/kaseciak
```

<!-- TODO: add screenshots & docs about additional env variables -->
