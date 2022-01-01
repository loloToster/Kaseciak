const ytMusic = require("node-youtube-music")
const { Player, Track } = require("discord-player")
const { UserResolvable } = require("discord.js")

const DEF_YT_LINK = "https://www.youtube.com/watch?v="

/**
 * 
 * @param {String} query 
 * @param {Player} player 
 * @param {UserResolvable} requestedBy
 * @returns 
 */
module.exports = async (query, player, requestedBy) => {
    let results = []
    const songs = await ytMusic.searchMusics(query)

    for (const song of songs) {
        results.push(new Track(player, {
            author: song.artists.map(a => a.name).join(", "),
            duration: song.duration.label,
            requestedBy: player.client.users.resolve(requestedBy),
            thumbnail: song.thumbnailUrl,
            title: song.title,
            url: DEF_YT_LINK + song.youtubeId,
            source: "youtube",
            live: false
        }))
    }

    return { tracks: results }
}   
