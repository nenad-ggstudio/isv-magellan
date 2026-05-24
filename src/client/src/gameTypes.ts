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

export type ActiveGameState = {
  id: string
  name: string
  startedAt: string
  resources: GameResources
}

export type GameState = {
  screen: 'bootstrap' | 'game'
  actions: GameStateAction[]
  game: ActiveGameState | null
}
