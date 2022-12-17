import { stations, sources } from "./radio-stations.json"

export type StationName = keyof typeof stations

export { stations, sources }
