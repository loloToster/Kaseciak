// https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url
export function isValidUrl(s: string) {
  let url
  try {
    url = new URL(s)
  } catch {
    return false
  }
  return url.protocol == "http:" || url.protocol == "https:"
}
