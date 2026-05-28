import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, WheelEvent } from 'react'
import { cx } from '../../../classNames'
import type { GravityHeatMap, StellarSystem } from '../../../gameTypes'
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
import {
  mapControlButton,
  mapScale,
  mapToolbar,
  mapViewport,
} from '../styleClasses'

const stellarMapDefaultSizePixels = 900
const stellarSystemHitTargetRadiusPixels = 20

export function StellarMapView({
  gizmoReferenceSpan,
  gravityHeatMap,
  gridStep,
  map,
  majorGridStep,
  minimumViewSpan,
  onDebug,
  onSelectSystem,
  selectedSystemId,
  shipPosition,
}: {
  gizmoReferenceSpan: number
  gravityHeatMap?: GravityHeatMap | null
  gridStep: number
  map: StellarMap
  majorGridStep: number
  minimumViewSpan: number
  onDebug: (message: string) => void
  onSelectSystem: (systemId: string) => void
  selectedSystemId: string | null
  shipPosition: MapPosition
}) {
  const [viewport, setViewport] = useState(() =>
    getInitialSectorViewport(map),
  )
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [svgSizePixels, setSvgSizePixels] = useState(
    stellarMapDefaultSizePixels,
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
  const svgUnitsPerPixel = viewSpan / svgSizePixels
  const gridLines = useMemo(
    () => buildSectorGridLines(map, gridStep, majorGridStep),
    [gridStep, majorGridStep, map],
  )
  const zoomInDisabled =
    constrainedViewport.zoom >= getMaximumSectorZoom(map, minimumViewSpan)
  const zoomOutDisabled = constrainedViewport.zoom <= 1

  useEffect(() => {
    const currentSvg = svgRef.current

    if (!currentSvg) {
      return
    }

    const svgElement: SVGSVGElement = currentSvg

    function syncSvgSize() {
      const bounds = svgElement.getBoundingClientRect()

      if (bounds.width <= 0 || bounds.height <= 0) {
        return
      }

      const nextSize = Math.min(bounds.width, bounds.height)

      setSvgSizePixels((currentSize) =>
        Math.abs(currentSize - nextSize) < 0.5 ? currentSize : nextSize,
      )
    }

    syncSvgSize()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncSvgSize)

      return () => window.removeEventListener('resize', syncSvgSize)
    }

    const resizeObserver = new ResizeObserver(syncSvgSize)
    resizeObserver.observe(svgElement)

    return () => resizeObserver.disconnect()
  }, [])

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
      className={mapViewport}
      data-dragging={dragState !== null}
      aria-label={`${map.label} stellar systems`}
    >
      <div className={mapToolbar}>
        <button
          aria-label="Zoom out"
          className={mapControlButton}
          disabled={zoomOutDisabled}
          onClick={() => changeZoom(1 / sectorZoomMultiplier)}
          type="button"
        >
          -
        </button>
        <output
          aria-label="Visible map span"
          className={mapScale}
        >
          {formatMapScale(viewSpan, map.distanceUnit)}
        </output>
        <button
          aria-label="Zoom in"
          className={mapControlButton}
          disabled={zoomInDisabled}
          onClick={() => changeZoom(sectorZoomMultiplier)}
          type="button"
        >
          +
        </button>
        <button
          aria-label="Reset map view"
          className={mapControlButton}
          onClick={resetViewport}
          type="button"
        >
          []
        </button>
        <button
          aria-label="Center on ship at maximum zoom"
          className={cx(mapControlButton, 'w-[46px] text-[10px] tracking-normal')}
          onClick={zoomToShip}
          type="button"
        >
          SHIP
        </button>
      </div>

      <svg
        className={cx(
          'block aspect-square h-auto max-h-full w-[min(100%,900px)] max-w-full cursor-grab touch-none [filter:drop-shadow(0_0_32px_rgb(172_199_193_/_10%))] max-[800px]:w-[min(100%,430px)]',
          dragState !== null && 'cursor-grabbing',
        )}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onWheel={handleWheel}
        ref={svgRef}
        role="img"
        viewBox={`${viewLeft} ${viewTop} ${viewSpan} ${viewSpan}`}
      >
        <title>{map.label}</title>
        <rect
          className="fill-[rgb(1_3_4_/_72%)] stroke-[rgb(180_207_204_/_36%)] [stroke-width:1]"
          height={map.height}
          vectorEffect="non-scaling-stroke"
          width={map.width}
          x="0"
          y="0"
        />
        {gridLines.map((line) => (
          <line
            className={cx(
              'stroke-[rgb(131_157_158_/_11%)] [stroke-width:1]',
              line.major && 'stroke-[rgb(155_184_184_/_19%)]',
            )}
            data-major={line.major}
            key={line.id}
            vectorEffect="non-scaling-stroke"
            x1={line.x1}
            x2={line.x2}
            y1={line.y1}
            y2={line.y2}
          />
        ))}
        {gravityHeatMap ? (
          <GravityHeatMapOverlay heatMap={gravityHeatMap} />
        ) : null}
        {map.systems.map((system) => (
          <StellarSystemMarker
            key={system.id}
            map={map}
            onDebug={onDebug}
            onSelectSystem={onSelectSystem}
            selected={system.id === selectedSystemId}
            system={system}
            gizmoReferenceSpan={gizmoReferenceSpan}
            svgUnitsPerPixel={svgUnitsPerPixel}
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

function GravityHeatMapOverlay({
  heatMap,
}: {
  heatMap: GravityHeatMap
}) {
  const heatMapDataUrl = useMemo(
    () => buildGravityHeatMapDataUrl(heatMap),
    [heatMap],
  )

  return (
    <image
      className="pointer-events-none [mix-blend-mode:screen]"
      height={heatMap.height}
      href={heatMapDataUrl}
      opacity="0.92"
      preserveAspectRatio="none"
      style={{ imageRendering: 'pixelated' }}
      width={heatMap.width}
      x="0"
      y="0"
    />
  )
}

function buildGravityHeatMapDataUrl(heatMap: GravityHeatMap) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  canvas.width = heatMap.columns
  canvas.height = heatMap.rows

  if (!context) {
    return ''
  }

  const imageData = context.createImageData(heatMap.columns, heatMap.rows)

  heatMap.values.forEach((value, index) => {
    const sourceRow = Math.floor(index / heatMap.columns)
    const column = index % heatMap.columns
    const canvasRow = heatMap.rows - sourceRow - 1
    const targetIndex = ((canvasRow * heatMap.columns) + column) * 4
    const [red, green, blue] = getGravityHeatColor(value)
    const alpha = getGravityHeatAlpha(value)

    imageData.data[targetIndex] = red
    imageData.data[targetIndex + 1] = green
    imageData.data[targetIndex + 2] = blue
    imageData.data[targetIndex + 3] = alpha
  })

  context.putImageData(imageData, 0, 0)

  return canvas.toDataURL('image/png')
}

function getGravityHeatColor(value: number): [number, number, number] {
  if (value > 0.82) {
    return [255, 241, 166]
  }

  if (value > 0.56) {
    return [212, 213, 111]
  }

  if (value > 0.28) {
    return [116, 214, 189]
  }

  return [55, 103, 108]
}

function getGravityHeatAlpha(value: number) {
  if (value < 0.025) {
    return 0
  }

  return Math.round(Math.min(222, Math.max(10, value * 210)))
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
    <g className="pointer-events-none" aria-label="Ship position">
      <circle
        className="fill-none stroke-[#55d6c2]"
        cx={point.x}
        cy={point.y}
        r={ringRadius}
        strokeWidth={strokeWidth}
      />
      <circle
        className="fill-[#f4f7f7] stroke-[#010304]"
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
  onDebug,
  onSelectSystem,
  selected,
  system,
  svgUnitsPerPixel,
  zoom,
}: {
  gizmoReferenceSpan: number
  map: StellarMap
  onDebug: (message: string) => void
  onSelectSystem: (systemId: string) => void
  selected: boolean
  system: StellarSystem
  svgUnitsPerPixel: number
  zoom: number
}) {
  const point = toSectorMapPoint(system, map)
  const markerScale = getStellarGizmoScale(map, zoom, gizmoReferenceSpan)
  const dotRadius = 0.09 * markerScale
  const hitTargetRadius = stellarSystemHitTargetRadiusPixels * svgUnitsPerPixel
  const hoverRadius = 0.2 * markerScale
  const selectionRadius = 0.25 * markerScale
  const markerStrokeWidth = 0.04 * markerScale
  const debugBoundsRadius =
    Math.max(dotRadius, hitTargetRadius, hoverRadius, selectionRadius) +
    markerStrokeWidth

  return (
    <g
      aria-label={system.name}
      className={cx(
        'group outline-none focus:outline-none',
        getSpectralTypeClass(system.starType),
      )}
      data-role={system.role}
      data-selected={selected}
      data-spectral-type={getSpectralType(system.starType)}
      onPointerEnter={() =>
        onDebug(
          buildStellarSystemDebugLine(
            'g enter',
            system,
            map,
            point,
            markerScale,
            hitTargetRadius,
            hoverRadius,
            selectionRadius,
            svgUnitsPerPixel,
          ),
        )
      }
      onPointerLeave={() =>
        onDebug(
          buildStellarSystemDebugLine(
            'g leave',
            system,
            map,
            point,
            markerScale,
            hitTargetRadius,
            hoverRadius,
            selectionRadius,
            svgUnitsPerPixel,
          ),
        )
      }
      onKeyDown={(event) =>
        selectSystemFromKeyboard(event, system, onSelectSystem)
      }
      role="button"
      tabIndex={0}
    >
      <rect
        className="pointer-events-none fill-none stroke-[#ff4fd8] opacity-90 [stroke-dasharray:4_3] [stroke-width:1]"
        data-debug="stellar-system-g-border"
        height={debugBoundsRadius * 2}
        vectorEffect="non-scaling-stroke"
        width={debugBoundsRadius * 2}
        x={point.x - debugBoundsRadius}
        y={point.y - debugBoundsRadius}
      />
      <circle
        className="peer cursor-pointer fill-transparent stroke-[#65ff86] [pointer-events:all] [stroke-width:1]"
        cx={point.x}
        cy={point.y}
        onClick={() => onSelectSystem(system.id)}
        onMouseDown={(event) => event.preventDefault()}
        onPointerEnter={() =>
          onDebug(
            buildStellarSystemDebugLine(
              'hit enter',
              system,
              map,
              point,
              markerScale,
              hitTargetRadius,
              hoverRadius,
              selectionRadius,
              svgUnitsPerPixel,
            ),
          )
        }
        onPointerLeave={() =>
          onDebug(
            buildStellarSystemDebugLine(
              'hit leave',
              system,
              map,
              point,
              markerScale,
              hitTargetRadius,
              hoverRadius,
              selectionRadius,
              svgUnitsPerPixel,
            ),
          )
        }
        onPointerDown={(event) => event.stopPropagation()}
        r={hitTargetRadius}
        vectorEffect="non-scaling-stroke"
      />
      <circle
        className="pointer-events-none fill-none stroke-current opacity-0 transition-opacity duration-[140ms] peer-hover:opacity-[0.78] group-focus-visible:opacity-[0.78]"
        cx={point.x}
        cy={point.y}
        r={hoverRadius}
        strokeWidth={markerStrokeWidth}
      />
      <circle
        className={cx(
          'pointer-events-none fill-none stroke-current opacity-0 transition-opacity duration-[140ms]',
          selected && 'opacity-90',
        )}
        cx={point.x}
        cy={point.y}
        r={selectionRadius}
        strokeWidth={markerStrokeWidth}
      />
      <circle
        className="pointer-events-none fill-current stroke-[#010304]"
        cx={point.x}
        cy={point.y}
        r={dotRadius}
        strokeWidth={markerStrokeWidth}
      />
    </g>
  )
}

function getSpectralTypeClass(starType: string) {
  switch (getSpectralType(starType)) {
    case 'o':
      return 'text-[#9fbdff]'
    case 'b':
      return 'text-[#b7ccff]'
    case 'a':
      return 'text-[#f1f6ff]'
    case 'f':
      return 'text-[#fff0bc]'
    case 'g':
      return 'text-[#ffd96a]'
    case 'k':
      return 'text-[#ffad5b]'
    case 'm':
      return 'text-[#ff755f]'
    default:
      return 'text-[#d8e0df]'
  }
}

function buildStellarSystemDebugLine(
  eventName: string,
  system: StellarSystem,
  map: StellarMap,
  point: MapPosition,
  markerScale: number,
  hitTargetRadius: number,
  hoverRadius: number,
  selectionRadius: number,
  svgUnitsPerPixel: number,
) {
  return [
    `${eventName}: ${system.name}`,
    `map=${map.id}`,
    `system=(${formatDebugNumber(system.x)}, ${formatDebugNumber(system.y)})`,
    `svg=(${formatDebugNumber(point.x)}, ${formatDebugNumber(point.y)})`,
    `markerScale=${formatDebugNumber(markerScale)}`,
    `hitR=${formatDebugRadius(hitTargetRadius, svgUnitsPerPixel)}`,
    `hoverR=${formatDebugRadius(hoverRadius, svgUnitsPerPixel)}`,
    `selectR=${formatDebugRadius(selectionRadius, svgUnitsPerPixel)}`,
    `svgUnit/px=${formatDebugNumber(svgUnitsPerPixel)}`,
  ].join(' | ')
}

function formatDebugRadius(radius: number, svgUnitsPerPixel: number) {
  const pixelRadius = radius / Math.max(svgUnitsPerPixel, 0.000001)

  return `${formatDebugNumber(radius)} map, ${formatDebugNumber(pixelRadius)} px`
}

function formatDebugNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(4)
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
