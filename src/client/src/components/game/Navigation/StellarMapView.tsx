import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, WheelEvent } from 'react'
import { cx } from '../../../classNames'
import type {
  EmScanReport,
  GravityHeatMap,
  StellarSystem,
} from '../../../gameTypes'
import { sectorZoomMultiplier } from './constants'
import { formatMapScale, getSpectralType } from './formatters'
import {
  buildSectorGridLines,
  constrainSectorViewport,
  getInitialSectorViewport,
  getMaximumSectorZoom,
  getSectorViewSpan,
  getStellarGizmoScale,
  clamp,
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
  emScanReports = [],
  emScanTarget,
  gizmoReferenceSpan,
  gravityHeatMap,
  jumpTarget,
  gridStep,
  map,
  majorGridStep,
  minimumViewSpan,
  onSelectEmReport,
  onSelectSystem,
  onTargetMapPoint,
  selectedEmReportId,
  selectedSystemId,
  shipPosition,
  targeting = false,
  targetingLabel = 'Choose map target',
}: {
  emScanReports?: EmScanReport[]
  emScanTarget?: { x: number; y: number; radiusLightYears: number } | null
  gizmoReferenceSpan: number
  gravityHeatMap?: GravityHeatMap | null
  jumpTarget?: MapPosition | null
  gridStep: number
  map: StellarMap
  majorGridStep: number
  minimumViewSpan: number
  onSelectEmReport?: (reportId: string) => void
  onSelectSystem: (systemId: string) => void
  onTargetMapPoint?: (position: MapPosition) => void
  selectedEmReportId?: string | null
  selectedSystemId: string | null
  shipPosition: MapPosition
  targeting?: boolean
  targetingLabel?: string
}) {
  const [viewport, setViewport] = useState(() =>
    getInitialSectorViewport(map),
  )
  const svgRef = useRef<SVGSVGElement | null>(null)
  const targetPointerStart = useRef<{
    pointerId: number
    x: number
    y: number
  } | null>(null)
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
    if (targeting) {
      return
    }

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

  function handleTargetPointerDown(event: PointerEvent<SVGRectElement>) {
    if (event.button !== 0) {
      return
    }

    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    targetPointerStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    }
  }

  function handleTargetPointerUp(event: PointerEvent<SVGRectElement>) {
    const start = targetPointerStart.current

    if (!start || start.pointerId !== event.pointerId) {
      return
    }

    event.stopPropagation()

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    targetPointerStart.current = null

    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y)

    if (moved > 6) {
      return
    }

    const target = getTargetMapPosition(event, map)

    if (target) {
      onTargetMapPoint?.(target)
    }
  }

  function handleTargetPointerCancel(event: PointerEvent<SVGRectElement>) {
    if (targetPointerStart.current?.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    targetPointerStart.current = null
  }

  return (
    <div
      className={mapViewport}
      data-dragging={dragState !== null}
      data-targeting={targeting}
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
          'block aspect-square h-auto max-h-full w-[min(100%,900px)] max-w-full touch-none [filter:drop-shadow(0_0_32px_rgb(172_199_193_/_10%))] max-[800px]:w-[min(100%,430px)]',
          targeting ? 'cursor-crosshair' : 'cursor-grab',
          dragState !== null && !targeting && 'cursor-grabbing',
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
        {emScanReports.map((report) => (
          <EmScanReportMarker
            key={report.id}
            map={map}
            onSelectEmReport={onSelectEmReport}
            report={report}
            selected={report.id === selectedEmReportId}
          />
        ))}
        {emScanTarget ? (
          <EmScanTargetMarker
            map={map}
            target={emScanTarget}
          />
        ) : null}
        {jumpTarget ? <JumpTargetMarker map={map} target={jumpTarget} /> : null}
        {targeting ? (
          <rect
            aria-label={targetingLabel}
            className="cursor-crosshair fill-transparent"
            height={map.height}
            onPointerCancel={handleTargetPointerCancel}
            onPointerDown={handleTargetPointerDown}
            onPointerUp={handleTargetPointerUp}
            width={map.width}
            x="0"
            y="0"
          />
        ) : null}
      </svg>
    </div>
  )
}

function JumpTargetMarker({
  map,
  target,
}: {
  map: StellarMap
  target: MapPosition
}) {
  const point = toSectorMapPoint(target, map)

  return (
    <g className="pointer-events-none" aria-label="Jump target">
      <circle
        className="fill-[rgb(0_196_232_/_10%)] stroke-[#00c4e8]"
        cx={point.x}
        cy={point.y}
        r="0.065"
        strokeDasharray="0.018 0.012"
        strokeWidth="0.012"
      />
      <path
        className="stroke-[#f4f7f7]"
        d={`M${point.x - 0.045} ${point.y}H${point.x + 0.045}M${point.x} ${point.y - 0.045}V${point.y + 0.045}`}
        strokeWidth="0.012"
      />
    </g>
  )
}

function getTargetMapPosition(
  event: PointerEvent<SVGRectElement>,
  map: StellarMap,
): MapPosition | null {
  const svg = event.currentTarget.ownerSVGElement

  if (!svg) {
    return null
  }

  const screenMatrix = svg.getScreenCTM()

  if (!screenMatrix) {
    return null
  }

  const point = svg.createSVGPoint()

  point.x = event.clientX
  point.y = event.clientY

  const svgPoint = point.matrixTransform(screenMatrix.inverse())

  return {
    x: clamp(svgPoint.x, 0, map.width),
    y: clamp(map.height - svgPoint.y, 0, map.height),
  }
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

function EmScanTargetMarker({
  map,
  target,
}: {
  map: StellarMap
  target: { x: number; y: number; radiusLightYears: number }
}) {
  const point = toSectorMapPoint(target, map)

  return (
    <g className="pointer-events-none" aria-label="EM scan target">
      <circle
        className="fill-[rgb(112_214_189_/_8%)] stroke-[#70d6bd]"
        cx={point.x}
        cy={point.y}
        r={target.radiusLightYears}
        strokeDasharray="0.018 0.018"
        strokeWidth="0.012"
      />
      <path
        className="stroke-[#d7ece5]"
        d={`M${point.x - 0.035} ${point.y}H${point.x + 0.035}M${point.x} ${point.y - 0.035}V${point.y + 0.035}`}
        strokeWidth="0.01"
      />
    </g>
  )
}

function EmScanReportMarker({
  map,
  onSelectEmReport,
  report,
  selected,
}: {
  map: StellarMap
  onSelectEmReport?: (reportId: string) => void
  report: EmScanReport
  selected: boolean
}) {
  const point = toSectorMapPoint(report.target, map)
  const markerRadius = 0.035
  const ringRadius = Math.max(0.055, report.radiusLightYears * 0.55)

  return (
    <g
      aria-label="EM scan report"
      className="group outline-none focus:outline-none"
      data-selected={selected}
      onKeyDown={(event) =>
        selectEmReportFromKeyboard(event, report, onSelectEmReport)
      }
      role="button"
      tabIndex={0}
    >
      <circle
        className="peer cursor-pointer fill-[#70d6bd] opacity-[0.001] [pointer-events:all]"
        cx={point.x}
        cy={point.y}
        onClick={(event) => {
          event.stopPropagation()
          onSelectEmReport?.(report.id)
        }}
        onMouseDown={(event) => event.preventDefault()}
        onPointerDown={(event) => event.stopPropagation()}
        r={ringRadius}
      />
      <circle
        className={cx(
          'pointer-events-none fill-[rgb(112_214_189_/_7%)] stroke-[#70d6bd] opacity-70',
          selected && 'opacity-100',
        )}
        cx={point.x}
        cy={point.y}
        r={ringRadius}
        strokeDasharray="0.015 0.012"
        strokeWidth="0.01"
      />
      <path
        className={cx(
          'pointer-events-none fill-[#70d6bd] stroke-[#010304]',
          selected && 'fill-[#d7ece5]',
        )}
        d={`M${point.x} ${point.y - markerRadius}L${point.x + markerRadius} ${point.y}L${point.x} ${point.y + markerRadius}L${point.x - markerRadius} ${point.y}Z`}
        strokeWidth="0.01"
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
  svgUnitsPerPixel,
  zoom,
}: {
  gizmoReferenceSpan: number
  map: StellarMap
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
      onKeyDown={(event) =>
        selectSystemFromKeyboard(event, system, onSelectSystem)
      }
      role="button"
      tabIndex={0}
    >
      <circle
        className="peer cursor-pointer [pointer-events:all]"
        cx={point.x}
        cy={point.y}
        fill="#ffffff"
        fillOpacity="0.001"
        onClick={() => onSelectSystem(system.id)}
        onMouseDown={(event) => event.preventDefault()}
        onPointerDown={(event) => event.stopPropagation()}
        r={hitTargetRadius}
        stroke="#ffffff"
        strokeOpacity="0.001"
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

function selectEmReportFromKeyboard(
  event: KeyboardEvent<SVGGElement>,
  report: EmScanReport,
  onSelectEmReport?: (reportId: string) => void,
) {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return
  }

  event.preventDefault()
  onSelectEmReport?.(report.id)
}
