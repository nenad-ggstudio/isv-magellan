import type {
  JumpAreaMap,
  LocalMapContact,
  LongRangeMap,
} from '../../../gameTypes'

export type NavigationMode = 'long-range-map' | 'jump-area' | 'local-map'

export type StellarMap = LongRangeMap | JumpAreaMap

export type MapPosition = {
  x: number
  y: number
}

export type SectorViewport = {
  centerX: number
  centerY: number
  zoom: number
}

export type DragState = {
  pointerId: number
  x: number
  y: number
}

export type SectorGridLine = {
  id: string
  x1: number
  x2: number
  y1: number
  y2: number
  major: boolean
}

export type LocalMapContactPosition = {
  contact: LocalMapContact
  x: number
  y: number
  distance: number
  signalAgeSeconds: number
}
