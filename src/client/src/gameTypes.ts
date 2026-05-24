export type GameTick = {
  elapsedMilliseconds: number
  tick: number
}

export type GameStateAction = {
  id: string
  label: string
}

export type GameResources = {
  water: number
  iron: number
  power: number
}

export type DistanceUnit = 'lightYear' | 'kilometer'

export type SensorContactKind =
  | 'asteroid'
  | 'comet'
  | 'debris'
  | 'largeAsteroid'
  | 'nebula'
  | 'planetoid'
  | 'star'

export type WorldPosition = {
  label: string
  x: number
  y: number
  unit: DistanceUnit
}

export type SensorContact = {
  id: string
  name: string
  kind: SensorContactKind
  x: number
  y: number
  distance: number
  signalAgeSeconds: number
  classification: string
  markerScale: number
}

export type SensorScan = {
  id: 'long-range' | 'local-sector'
  label: string
  radius: number
  distanceUnit: DistanceUnit
  contacts: SensorContact[]
}

export type GameWorld = {
  shipPosition: WorldPosition
  currentTime: string
  longRangeScan: SensorScan
  localSectorScan: SensorScan
}

export type ActiveGameState = {
  id: string
  name: string
  startedAt: string
  resources: GameResources
  world: GameWorld
}

export type GameState = {
  screen: 'bootstrap' | 'game'
  actions: GameStateAction[]
  game: ActiveGameState | null
}
