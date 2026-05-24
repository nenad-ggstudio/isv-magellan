export type GameTick = {
  elapsedMilliseconds: number
  tick: number
}

export type GameStateAction = {
  id: string
  label: string
}

export type GameResource = {
  contaminationLevel: number
}

export type GameResources = {
  water: GameResource
  lithium: GameResource
  carbon: GameResource
}

export type ResourceName = 'water' | 'lithium' | 'carbon'

export type StoredResource = {
  resource: ResourceName
  quantityKilograms: number
  purityLevel: number
}

export type StorageUnit = {
  slotNumber: number
  capacityKilograms: number
  contents: StoredResource | null
}

export type Ship = {
  name: string
  storageUnits: StorageUnit[]
}

export type DistanceUnit = 'lightYear' | 'kilometer'

export type WorldPosition = {
  label: string
  x: number
  y: number
  unit: DistanceUnit
}

export type ResourceEstimate = {
  resource: ResourceName
  minimum: number
  maximum: number
  label: string
}

export type SensorContact = {
  id: string
  name: string
  kind: 'asteroid'
  asteroidTypeId: 'c-type' | 's-type' | 'm-type'
  asteroidTypeLabel: string
  x: number
  y: number
  distance: number
  signalAgeSeconds: number
  markerScale: number
  resourceEstimates: ResourceEstimate[]
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
  ship: Ship
}

export type GameState = {
  screen: 'bootstrap' | 'game'
  actions: GameStateAction[]
  game: ActiveGameState | null
}
