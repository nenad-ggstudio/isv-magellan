import { useMemo } from 'react'
import type { LongRangeMap } from '../../../gameTypes'
import {
  sectorGridStepLightYears,
  sectorMajorGridStepLightYears,
  sectorMinimumViewLightYears,
} from './constants'
import { getMapDiagonal, getSectorBaseSpan } from './mapMath'
import { StellarMapView } from './StellarMapView'
import { StellarReadout } from './StellarReadout'
import type { MapPosition } from './types'

export function LongRangeMapPanel({
  elapsedMilliseconds,
  map,
  onSelectSystem,
  selectedSystemId,
  shipPosition,
}: {
  elapsedMilliseconds: number
  map: LongRangeMap
  onSelectSystem: (systemId: string) => void
  selectedSystemId: string | null
  shipPosition: MapPosition
}) {
  const selectedSystem = useMemo(
    () => map.systems.find((system) => system.id === selectedSystemId) ?? null,
    [map.systems, selectedSystemId],
  )

  return (
    <div className="navigation-content navigation-content--long-range-map">
      <StellarMapView
        gizmoReferenceSpan={getSectorBaseSpan(map)}
        gridStep={sectorGridStepLightYears}
        key="long-range-map"
        map={map}
        majorGridStep={sectorMajorGridStepLightYears}
        minimumViewSpan={sectorMinimumViewLightYears}
        onSelectSystem={onSelectSystem}
        selectedSystemId={selectedSystemId}
        shipPosition={shipPosition}
      />
      <StellarReadout
        elapsedMilliseconds={elapsedMilliseconds}
        extentLabel="Sector"
        extentValue={getMapDiagonal(map)}
        map={map}
        selectedSystem={selectedSystem}
      />
    </div>
  )
}
