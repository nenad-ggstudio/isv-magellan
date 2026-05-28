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

export type FusionFuelReservoir = {
  fuel: 'deuterium' | 'tritium'
  capacityKilograms: number
  quantityKilograms: number
  purityLevel: number
}

export type CoolantTank = {
  coolant: 'water'
  capacityKilograms: number
  quantityKilograms: number
  purityLevel: number
}

export type FusionCore = {
  deuteriumReservoir: FusionFuelReservoir
  tritiumReservoir: FusionFuelReservoir
  coolantTank: CoolantTank
}

export type BatteryBank = {
  designCapacityKilowattHours: number
  maxCapacityKilowattHours: number
  chargeLevel: number
  healthLevel: number
  storedKilowattHours: number
}

export type GravityHeatMap = {
  columns: number
  rows: number
  width: number
  height: number
  values: number[]
}

export type GravityScanResult = {
  id: string
  generatedAtTick: number
  noiseLevel: number
  heatMap: GravityHeatMap
}

export type GravityScannerScan = {
  startedAtTick: number
  completesAtTick: number
  result: GravityScanResult
}

export type GravityScanner = {
  id: 'gravity-scanner'
  label: string
  scanDurationTicks: number
  currentScan: GravityScannerScan | null
}

export type ShipScanners = {
  gravityScanner: GravityScanner
}

export type Ship = {
  name: string
  storageUnits: StorageUnit[]
  fusionCore: FusionCore
  batteryBank: BatteryBank
  scanners: ShipScanners
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

export type LocalMapContact = {
  id: string
  name: string
  kind: 'asteroid'
  asteroidTypeId: 'c-type' | 's-type' | 'm-type'
  asteroidTypeLabel: string
  x: number
  y: number
  distance: number
  signalAgeSeconds: number
  speedKilometersPerSecond: number
  directionDegrees: number
  resourceEstimates: ResourceEstimate[]
}

export type LocalMap = {
  id: 'local-map'
  label: string
  radius: number
  distanceUnit: DistanceUnit
  contacts: LocalMapContact[]
}

export type StellarSystemRole = 'origin' | 'waypoint' | 'destination'

export type ResourceDetection = {
  resource: ResourceName
  detected: boolean
  confidence: number
}

export type StellarSystem = {
  id: string
  name: string
  role: StellarSystemRole
  starType: string
  starSizeSolarRadii: number
  x: number
  y: number
  distance: number
  planetCountPrediction: number
  planetCountAccuracy: number
  resourceDetections: ResourceDetection[]
}

export type LongRangeMap = {
  id: 'long-range-map'
  label: string
  width: number
  height: number
  distanceUnit: DistanceUnit
  systems: StellarSystem[]
}

export type SensorAnomalyKind =
  | 'rogue-planet'
  | 'asteroid-cluster'
  | 'comet'
  | 'energy-particle-wells'

export type SensorAnomaly = {
  id: string
  kind: SensorAnomalyKind
  label: string
  x: number
  y: number
  distance: number
}

export type JumpAreaMap = {
  id: 'jump-area'
  label: string
  width: number
  height: number
  distanceUnit: DistanceUnit
  systems: StellarSystem[]
  anomalies: SensorAnomaly[]
}

export type GameWorld = {
  shipPosition: WorldPosition
  currentTime: string
  longRangeMap: LongRangeMap
  jumpAreaMap: JumpAreaMap
  localMap: LocalMap
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
