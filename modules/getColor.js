const getColors = require("get-image-colors")
const axios = require("axios")

async function getColorFromUrl(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' })
        const buffer = Buffer.from(response.data, "utf-8")
        const colors = await getColors(buffer, { type: response.headers["content-type"], count: 1 })
        return colors[0].hex()
    } catch {
        return undefined
    }
}

module.exports = (url, timeout) => {
    return Promise.race([
        getColorFromUrl(url),
        new Promise((res) => setTimeout(res, timeout))
    ])
}
