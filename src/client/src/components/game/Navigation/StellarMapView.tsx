import { useMemo, useState } from 'react'
import type { KeyboardEvent, PointerEvent, WheelEvent } from 'react'
import type { StellarSystem } from '../../../gameTypes'
import { sectorZoomMultiplier } from './constants'
import { formatMapScale, getSpectralType } from './formatters'
import {
  buildSectorGridLines,
  constrainSectorViewport,
  getInitialSectorViewport,
  getMaximumSectorZoom,
  getSectorViewSpan,
  getStellarGizmoScale,
  toSectorMapPoint,
  zoomSectorViewport,
} from './mapMath'
import type { DragState, MapPosition, StellarMap } from './types'

export function StellarMapView({
  gizmoReferenceSpan,
  gridStep,
  map,
  majorGridStep,
  minimumViewSpan,
  onSelectSystem,
  selectedSystemId,
  shipPosition,
}: {
  gizmoReferenceSpan: number
  gridStep: number
  map: StellarMap
  majorGridStep: number
  minimumViewSpan: number
  onSelectSystem: (systemId: string) => void
  selectedSystemId: string | null
  shipPosition: MapPosition
}) {
  const [viewport, setViewport] = useState(() =>
    getInitialSectorViewport(map),
  )
  const [dragState, setDragState] = useState<DragState | null>(null)
  const constrainedViewport = constrainSectorViewport(
    map,
    viewport,
    minimumViewSpan,
  )
  const viewSpan = getSectorViewSpan(map, constrainedViewport.zoom)
  const viewLeft = constrainedViewport.centerX - viewSpan / 2
  const viewTop = constrainedViewport.centerY - viewSpan / 2
  const gridLines = useMemo(
    () => buildSectorGridLines(map, gridStep, majorGridStep),
    [gridStep, majorGridStep, map],
  )
  const zoomInDisabled =
    constrainedViewport.zoom >= getMaximumSectorZoom(map, minimumViewSpan)
  const zoomOutDisabled = constrainedViewport.zoom <= 1

  function changeZoom(multiplier: number) {
    setViewport((currentViewport) =>
      zoomSectorViewport(
        map,
        currentViewport,
        currentViewport.zoom * multiplier,
        minimumViewSpan,
      ),
    )
  }

  function resetViewport() {
    setViewport(getInitialSectorViewport(map))
  }

  function zoomToShip() {
    setViewport(
      constrainSectorViewport(
        map,
        {
          centerX: shipPosition.x,
          centerY: map.height - shipPosition.y,
          zoom: getMaximumSectorZoom(map, minimumViewSpan),
        },
        minimumViewSpan,
      ),
    )
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault()

    const bounds = event.currentTarget.getBoundingClientRect()
    const focus = {
      ratioX: (event.clientX - bounds.left) / bounds.width,
      ratioY: (event.clientY - bounds.top) / bounds.height,
    }
    const nextZoom =
      constrainedViewport.zoom *
      (event.deltaY < 0 ? sectorZoomMultiplier : 1 / sectorZoomMultiplier)

    setViewport((currentViewport) =>
      zoomSectorViewport(
        map,
        currentViewport,
        nextZoom,
        minimumViewSpan,
        focus,
      ),
    )
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    setDragState({
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    })
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const deltaX = event.clientX - dragState.x
    const deltaY = event.clientY - dragState.y

    setViewport((currentViewport) => {
      const current = constrainSectorViewport(
        map,
        currentViewport,
        minimumViewSpan,
      )
      const currentViewSpan = getSectorViewSpan(map, current.zoom)

      return constrainSectorViewport(
        map,
        {
          ...current,
          centerX: current.centerX - (deltaX / bounds.width) * currentViewSpan,
          centerY: current.centerY - (deltaY / bounds.height) * currentViewSpan,
        },
        minimumViewSpan,
      )
    })
    setDragState({
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    })
  }

  function handlePointerEnd(event: PointerEvent<SVGSVGElement>) {
    if (dragState?.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      setDragState(null)
    }
  }

  return (
    <div
      className="stellar-map"
      data-dragging={dragState !== null}
      aria-label={`${map.label} stellar systems`}
    >
      <div className="stellar-map-toolbar">
        <button
          aria-label="Zoom out"
          className="map-control-button"
          disabled={zoomOutDisabled}
          onClick={() => changeZoom(1 / sectorZoomMultiplier)}
          type="button"
        >
          -
        </button>
        <output
          aria-label="Visible map span"
          className="stellar-map-scale"
        >
          {formatMapScale(viewSpan, map.distanceUnit)}
        </output>
        <button
          aria-label="Zoom in"
          className="map-control-button"
          disabled={zoomInDisabled}
          onClick={() => changeZoom(sectorZoomMultiplier)}
          type="button"
        >
          +
        </button>
        <button
          aria-label="Reset map view"
          className="map-control-button"
          onClick={resetViewport}
          type="button"
        >
          []
        </button>
        <button
          aria-label="Center on ship at maximum zoom"
          className="map-control-button map-control-button--ship"
          onClick={zoomToShip}
          type="button"
        >
          SHIP
        </button>
      </div>

      <svg
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onWheel={handleWheel}
        role="img"
        viewBox={`${viewLeft} ${viewTop} ${viewSpan} ${viewSpan}`}
      >
        <title>{map.label}</title>
        <rect
          className="stellar-sector-boundary"
          height={map.height}
          vectorEffect="non-scaling-stroke"
          width={map.width}
          x="0"
          y="0"
        />
        {gridLines.map((line) => (
          <line
            className="stellar-sector-grid-line"
            data-major={line.major}
            key={line.id}
            vectorEffect="non-scaling-stroke"
            x1={line.x1}
            x2={line.x2}
            y1={line.y1}
            y2={line.y2}
          />
        ))}
        {map.systems.map((system) => (
          <StellarSystemMarker
            key={system.id}
            map={map}
            onSelectSystem={onSelectSystem}
            selected={system.id === selectedSystemId}
            system={system}
            gizmoReferenceSpan={gizmoReferenceSpan}
            zoom={constrainedViewport.zoom}
          />
        ))}
        <ShipPositionMarker
          gizmoReferenceSpan={gizmoReferenceSpan}
          map={map}
          shipPosition={shipPosition}
          zoom={constrainedViewport.zoom}
        />
      </svg>
    </div>
  )
}

function ShipPositionMarker({
  gizmoReferenceSpan,
  map,
  shipPosition,
  zoom,
}: {
  gizmoReferenceSpan: number
  map: StellarMap
  shipPosition: MapPosition
  zoom: number
}) {
  const point = toSectorMapPoint(shipPosition, map)
  const markerScale = getStellarGizmoScale(map, zoom, gizmoReferenceSpan)
  const radius = 0.11 * markerScale
  const ringRadius = 0.26 * markerScale
  const strokeWidth = 0.045 * markerScale

  return (
    <g className="stellar-ship-position" aria-label="Ship position">
      <circle
        className="stellar-ship-position-ring"
        cx={point.x}
        cy={point.y}
        r={ringRadius}
        strokeWidth={strokeWidth}
      />
      <circle
        className="stellar-ship-position-core"
        cx={point.x}
        cy={point.y}
        r={radius}
        strokeWidth={strokeWidth}
      />
    </g>
  )
}

function StellarSystemMarker({
  gizmoReferenceSpan,
  map,
  onSelectSystem,
  selected,
  system,
  zoom,
}: {
  gizmoReferenceSpan: number
  map: StellarMap
  onSelectSystem: (systemId: string) => void
  selected: boolean
  system: StellarSystem
  zoom: number
}) {
  const point = toSectorMapPoint(system, map)
  const markerScale = getStellarGizmoScale(map, zoom, gizmoReferenceSpan)
  const dotRadius = 0.09 * markerScale
  const hitTargetRadius = 0.02 * markerScale
  const hoverRadius = 0.2 * markerScale
  const selectionRadius = 0.25 * markerScale
  const markerStrokeWidth = 0.04 * markerScale

  return (
    <g
      aria-label={system.name}
      className="stellar-system"
      data-role={system.role}
      data-selected={selected}
      data-spectral-type={getSpectralType(system.starType)}
      onClick={() => onSelectSystem(system.id)}
      onKeyDown={(event) =>
        selectSystemFromKeyboard(event, system, onSelectSystem)
      }
      onMouseDown={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      role="button"
      tabIndex={0}
    >
      <circle
        className="stellar-system-hit-target"
        cx={point.x}
        cy={point.y}
        r={hitTargetRadius}
      />
      <circle
        className="stellar-system-hover"
        cx={point.x}
        cy={point.y}
        r={hoverRadius}
        strokeWidth={markerStrokeWidth}
      />
      <circle
        className="stellar-system-selection"
        cx={point.x}
        cy={point.y}
        r={selectionRadius}
        strokeWidth={markerStrokeWidth}
      />
      <circle
        className="stellar-system-dot"
        cx={point.x}
        cy={point.y}
        r={dotRadius}
        strokeWidth={markerStrokeWidth}
      />
    </g>
  )
}

function selectSystemFromKeyboard(
  event: KeyboardEvent<SVGGElement>,
  system: StellarSystem,
  onSelectSystem: (systemId: string) => void,
) {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return
  }

  event.preventDefault()
  onSelectSystem(system.id)
}
