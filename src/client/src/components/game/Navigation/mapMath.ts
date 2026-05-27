import type { LocalMap, LocalMapContact } from '../../../gameTypes'
import {
  lightSpeedKilometersPerSecond,
  localMapMinimumViewRadiusKilometers,
} from './constants'
import type {
  LocalMapContactPosition,
  MapPosition,
  SectorGridLine,
  SectorViewport,
  StellarMap,
} from './types'

export function getInitialSectorViewport(map: StellarMap): SectorViewport {
  return {
    centerX: map.width / 2,
    centerY: map.height / 2,
    zoom: 1,
  }
}

export function getMapCenterPosition(map: StellarMap): MapPosition {
  return {
    x: map.width / 2,
    y: map.height / 2,
  }
}

export function buildSectorGridLines(
  map: StellarMap,
  gridStep: number,
  majorGridStep: number,
): SectorGridLine[] {
  const lines: SectorGridLine[] = []

  for (let x = 0; x <= map.width; x += gridStep) {
    const lineX = normalizeGridValue(x, map.width)
    lines.push({
      id: `x-${lineX}`,
      major: isMajorGridLine(lineX, map.width, majorGridStep),
      x1: lineX,
      x2: lineX,
      y1: 0,
      y2: map.height,
    })
  }

  for (let y = 0; y <= map.height; y += gridStep) {
    const lineY = normalizeGridValue(y, map.height)
    lines.push({
      id: `y-${lineY}`,
      major: isMajorGridLine(lineY, map.height, majorGridStep),
      x1: 0,
      x2: map.width,
      y1: lineY,
      y2: lineY,
    })
  }

  return lines
}

function normalizeGridValue(value: number, maximum: number) {
  return value > maximum - 0.000001
    ? maximum
    : Number(value.toFixed(4))
}

function isMajorGridLine(
  value: number,
  maximum: number,
  majorGridStep: number,
) {
  return (
    value === 0 ||
    value === maximum ||
    Math.abs(value / majorGridStep - Math.round(value / majorGridStep)) <
      0.000001
  )
}

export function getSectorBaseSpan(map: StellarMap) {
  return Math.max(map.width, map.height)
}

export function getMaximumSectorZoom(
  map: StellarMap,
  minimumViewSpan: number,
) {
  return Math.max(1, getSectorBaseSpan(map) / minimumViewSpan)
}

export function getSectorViewSpan(map: StellarMap, zoom: number) {
  return getSectorBaseSpan(map) / zoom
}

export function getStellarGizmoScale(
  map: StellarMap,
  zoom: number,
  referenceSpan: number,
) {
  return getSectorBaseSpan(map) / Math.max(referenceSpan, 0.000001) / zoom
}

export function zoomSectorViewport(
  map: StellarMap,
  viewport: SectorViewport,
  nextZoom: number,
  minimumViewSpan: number,
  focus?: { ratioX: number; ratioY: number },
) {
  const current = constrainSectorViewport(map, viewport, minimumViewSpan)
  const zoom = clamp(nextZoom, 1, getMaximumSectorZoom(map, minimumViewSpan))
  const currentSpan = getSectorViewSpan(map, current.zoom)
  const nextSpan = getSectorViewSpan(map, zoom)

  if (!focus) {
    return constrainSectorViewport(
      map,
      {
        ...current,
        zoom,
      },
      minimumViewSpan,
    )
  }

  const currentLeft = current.centerX - currentSpan / 2
  const currentTop = current.centerY - currentSpan / 2
  const focusX = currentLeft + focus.ratioX * currentSpan
  const focusY = currentTop + focus.ratioY * currentSpan

  return constrainSectorViewport(
    map,
    {
      centerX: focusX + (0.5 - focus.ratioX) * nextSpan,
      centerY: focusY + (0.5 - focus.ratioY) * nextSpan,
      zoom,
    },
    minimumViewSpan,
  )
}

export function constrainSectorViewport(
  map: StellarMap,
  viewport: SectorViewport,
  minimumViewSpan: number,
) {
  const zoom = clamp(
    viewport.zoom,
    1,
    getMaximumSectorZoom(map, minimumViewSpan),
  )
  const viewSpan = getSectorViewSpan(map, zoom)

  return {
    centerX: clampViewportCenter(viewport.centerX, map.width, viewSpan),
    centerY: clampViewportCenter(viewport.centerY, map.height, viewSpan),
    zoom,
  }
}

function clampViewportCenter(
  center: number,
  mapSize: number,
  viewSpan: number,
) {
  if (viewSpan >= mapSize) {
    return mapSize / 2
  }

  return clamp(center, viewSpan / 2, mapSize - viewSpan / 2)
}

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function toSectorMapPoint(position: MapPosition, map: StellarMap) {
  return {
    x: clamp(position.x, 0, map.width),
    y: clamp(map.height - position.y, 0, map.height),
  }
}

export function getMapDiagonal(map: StellarMap) {
  return Math.sqrt((map.width * map.width) + (map.height * map.height))
}

export function getMaximumLocalMapZoom(map: LocalMap) {
  return Math.max(1, map.radius / localMapMinimumViewRadiusKilometers)
}

export function getLiveLocalMapContact(
  contact: LocalMapContact,
  elapsedMilliseconds: number,
): LocalMapContactPosition {
  const elapsedSeconds = elapsedMilliseconds / 1000
  const directionRadians = degreesToRadians(contact.directionDegrees)
  const travelDistance = contact.speedKilometersPerSecond * elapsedSeconds
  const x = contact.x + Math.sin(directionRadians) * travelDistance
  const y = contact.y + Math.cos(directionRadians) * travelDistance
  const distance = Math.sqrt((x * x) + (y * y))

  return {
    contact,
    distance,
    signalAgeSeconds: distance / lightSpeedKilometersPerSecond,
    x,
    y,
  }
}

export function toLocalSvgPoint(contact: LocalMapContactPosition) {
  return {
    x: contact.x,
    y: -contact.y,
  }
}

export function degreesToRadians(degrees: number) {
  return (normalizeDegrees(degrees) * Math.PI) / 180
}

export function normalizeDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360
}
