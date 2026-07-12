import { describe, expect, it } from 'vitest'
import type { LocalMapContact } from '../../../gameTypes'
import {
  buildSectorGridLines,
  constrainSectorViewport,
  getInitialSectorViewport,
  getLiveLocalMapContact,
  normalizeDegrees,
  toSectorMapPoint,
} from './mapMath'
import type { StellarMap } from './types'

const map: StellarMap = {
  id: 'long-range-map',
  label: 'Test Map',
  width: 22,
  height: 10,
  distanceUnit: 'lightYear',
  systems: [],
}

describe('stellar map math', () => {
  it('centers the initial viewport and constrains zoomed panning to map bounds', () => {
    expect(getInitialSectorViewport(map)).toEqual({
      centerX: 11,
      centerY: 5,
      zoom: 1,
    })

    expect(
      constrainSectorViewport(
        map,
        { centerX: 100, centerY: -100, zoom: 2 },
        2,
      ),
    ).toEqual({
      centerX: 16.5,
      centerY: 5,
      zoom: 2,
    })
  })

  it('builds stable major grid lines including both map boundaries', () => {
    const lines = buildSectorGridLines(map, 2, 10)

    expect(lines).toContainEqual({
      id: 'x-0',
      major: true,
      x1: 0,
      x2: 0,
      y1: 0,
      y2: 10,
    })
    expect(lines).toContainEqual({
      id: 'x-22',
      major: true,
      x1: 22,
      x2: 22,
      y1: 0,
      y2: 10,
    })
  })

  it('clamps map targeting coordinates and flips the display y axis', () => {
    expect(toSectorMapPoint({ x: -5, y: 12 }, map)).toEqual({
      x: 0,
      y: 0,
    })
  })

  it('advances local contacts using their heading and speed', () => {
    const contact: LocalMapContact = {
      id: 'contact-1',
      name: 'Contact 1',
      kind: 'asteroid',
      asteroidTypeId: 'c-type',
      asteroidTypeLabel: 'C-type asteroid',
      x: 100,
      y: 200,
      distance: 0,
      signalAgeSeconds: 0,
      speedKilometersPerSecond: 10,
      directionDegrees: 90,
      resourceEstimates: [],
    }

    const position = getLiveLocalMapContact(contact, 1_000)

    expect(position.x).toBeCloseTo(110)
    expect(position.y).toBeCloseTo(200)
    expect(position.distance).toBeCloseTo(Math.sqrt(110 ** 2 + 200 ** 2))
    expect(position.signalAgeSeconds).toBeGreaterThan(0)
    expect(normalizeDegrees(-90)).toBe(270)
  })
})
