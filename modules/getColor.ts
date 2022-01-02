import getColors from "get-image-colors"
import axios from "axios"

async function getColorFromUrl(url: string) {
    try {
        const response = await axios.get(url, { responseType: "arraybuffer" })
        const buffer = Buffer.from(response.data, "utf-8")
        const colors = await getColors(buffer, response.headers["content-type"])
        return colors[0].hex()
    } catch {
        return undefined
    }
}

export default (url: string, timeout: number): Promise<undefined | string> => {
    let result: any = Promise.race([
        getColorFromUrl(url),
        new Promise((res) => setTimeout(res, timeout))
    ])

    return result
}
