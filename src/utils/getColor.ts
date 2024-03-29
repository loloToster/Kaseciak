import axios from "axios"
import getColors from "get-image-colors"
import NodeCache from "node-cache"

const cache = new NodeCache({ stdTTL: 600 })

async function getColorFromUrl(url: string, cacheId?: string) {
  let value: string | undefined
  if (cacheId) value = cache.get(cacheId)
  if (value) return value

  try {
    const response = await axios.get(url, { responseType: "arraybuffer" })
    const buffer = Buffer.from(response.data, "utf-8")
    const colors = await getColors(buffer, response.headers["content-type"])
    const hexColors = colors[0].hex()
    if (cacheId) cache.set(cacheId, hexColors)
    return hexColors
  } catch {
    return undefined
  }
}

export default (url: string, timeout: number, cacheId?: string) => {
  return Promise.race<string | undefined>([
    getColorFromUrl(url, cacheId),
    new Promise(res => setTimeout(res, timeout))
  ])
}
