import { useMemo } from 'react'
import type { JumpAreaMap } from '../../../gameTypes'
import {
  jumpAreaGridStepLightYears,
  jumpAreaMajorGridStepLightYears,
  jumpAreaMinimumViewLightYears,
} from './constants'
import { getMapCenterPosition } from './mapMath'
import { StellarMapView } from './StellarMapView'
import { StellarReadout } from './StellarReadout'

export function JumpAreaMapPanel({
  elapsedMilliseconds,
  gizmoReferenceSpan,
  map,
  onSelectSystem,
  selectedSystemId,
}: {
  elapsedMilliseconds: number
  gizmoReferenceSpan: number
  map: JumpAreaMap
  onSelectSystem: (systemId: string) => void
  selectedSystemId: string | null
}) {
  const shipPosition = getMapCenterPosition(map)
  const selectedSystem = useMemo(
    () => map.systems.find((system) => system.id === selectedSystemId) ?? null,
    [map.systems, selectedSystemId],
  )

  return (
    <div className="navigation-content navigation-content--long-range-map">
      <StellarMapView
        gizmoReferenceSpan={gizmoReferenceSpan}
        gridStep={jumpAreaGridStepLightYears}
        key="jump-area"
        map={map}
        majorGridStep={jumpAreaMajorGridStepLightYears}
        minimumViewSpan={jumpAreaMinimumViewLightYears}
        onSelectSystem={onSelectSystem}
        selectedSystemId={selectedSystemId}
        shipPosition={shipPosition}
      />
      <StellarReadout
        elapsedMilliseconds={elapsedMilliseconds}
        extentLabel="Area"
        extentValue={map.width}
        map={map}
        selectedSystem={selectedSystem}
      />
    </div>
  )
}
