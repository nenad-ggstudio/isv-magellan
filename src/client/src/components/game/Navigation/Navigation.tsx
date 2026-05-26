import { useMemo, useState } from 'react'
import type { KeyboardEvent, PointerEvent, WheelEvent } from 'react'
import type {
  DistanceUnit,
  GameWorld,
  JumpAreaMap,
  LongRangeMap,
  SensorContact,
  SensorScan,
  StellarSystem,
} from '../../../gameTypes'

type NavigationProps = {
  elapsedMilliseconds: number
  world: GameWorld
}

type NavigationMode = 'long-range-map' | 'jump-area' | 'local-sector'

type StellarMap = LongRangeMap | JumpAreaMap

type MapPosition = {
  x: number
  y: number
}

type SectorViewport = {
  centerX: number
  centerY: number
  zoom: number
}

type DragState = {
  pointerId: number
  x: number
  y: number
}

type SectorGridLine = {
  id: string
  x1: number
  x2: number
  y1: number
  y2: number
  major: boolean
}

const navigationModes: Array<{ id: NavigationMode; label: string }> = [
  { id: 'long-range-map', label: 'Sector Map' },
  { id: 'jump-area', label: 'Jump Area' },
  { id: 'local-sector', label: 'Local Scan' },
]

const mapCenter = 50
const mapRadius = 42
const sectorMinimumViewLightYears = 1
const sectorGridStepLightYears = 1
const sectorMajorGridStepLightYears = 5
const jumpAreaMinimumViewLightYears = 0.1
const jumpAreaGridStepLightYears = 0.1
const jumpAreaMajorGridStepLightYears = 0.5
const sectorZoomMultiplier = 1.6

export function Navigation({ elapsedMilliseconds, world }: NavigationProps) {
  const [mode, setMode] = useState<NavigationMode>('long-range-map')
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null)
  const jumpAreaShipPosition = getMapCenterPosition(world.jumpAreaMap)
  const stellarGizmoReferenceSpan = getSectorBaseSpan(world.longRangeMap)
  const sortedContacts = useMemo(
    () =>
      [...world.localSectorScan.contacts].sort(
        (firstContact, secondContact) =>
          firstContact.distance - secondContact.distance,
      ),
    [world.localSectorScan.contacts],
  )
  const selectedSystem = useMemo(
    () =>
      world.longRangeMap.systems.find(
        (system) => system.id === selectedSystemId,
      ) ?? null,
    [selectedSystemId, world.longRangeMap.systems],
  )
  const selectedJumpAreaSystem = useMemo(
    () =>
      world.jumpAreaMap.systems.find(
        (system) => system.id === selectedSystemId,
      ) ?? null,
    [selectedSystemId, world.jumpAreaMap.systems],
  )
  const activeLabel =
    mode === 'long-range-map'
      ? world.longRangeMap.label
      : mode === 'jump-area'
        ? world.jumpAreaMap.label
        : world.localSectorScan.label

  return (
    <section className="navigation-panel" aria-label="Navigation">
      <div className="navigation-shell">
        <header className="navigation-header">
          <div>
            <span className="panel-label">Navigation</span>
            <h2>{activeLabel}</h2>
          </div>
          <div
            className="scan-tabs"
            role="tablist"
            aria-label="Navigation view"
          >
            {navigationModes.map((navigationMode) => (
              <button
                aria-selected={navigationMode.id === mode}
                className="scan-tab"
                key={navigationMode.id}
                onClick={() => setMode(navigationMode.id)}
                role="tab"
                type="button"
              >
                {navigationMode.label}
              </button>
            ))}
          </div>
        </header>

        {mode === 'long-range-map' ? (
          <div className="navigation-content navigation-content--long-range-map">
            <LongRangeMapView
              gizmoReferenceSpan={stellarGizmoReferenceSpan}
              gridStep={sectorGridStepLightYears}
              key="long-range-map"
              map={world.longRangeMap}
              majorGridStep={sectorMajorGridStepLightYears}
              minimumViewSpan={sectorMinimumViewLightYears}
              onSelectSystem={setSelectedSystemId}
              selectedSystemId={selectedSystemId}
              shipPosition={world.shipPosition}
            />
            <StellarReadout
              elapsedMilliseconds={elapsedMilliseconds}
              extentLabel="Sector"
              extentValue={getMapDiagonal(world.longRangeMap)}
              map={world.longRangeMap}
              selectedSystem={selectedSystem}
            />
          </div>
        ) : mode === 'jump-area' ? (
          <div className="navigation-content navigation-content--long-range-map">
            <LongRangeMapView
              gizmoReferenceSpan={stellarGizmoReferenceSpan}
              gridStep={jumpAreaGridStepLightYears}
              key="jump-area"
              map={world.jumpAreaMap}
              majorGridStep={jumpAreaMajorGridStepLightYears}
              minimumViewSpan={jumpAreaMinimumViewLightYears}
              onSelectSystem={setSelectedSystemId}
              selectedSystemId={selectedSystemId}
              shipPosition={jumpAreaShipPosition}
            />
            <StellarReadout
              elapsedMilliseconds={elapsedMilliseconds}
              extentLabel="Area"
              extentValue={world.jumpAreaMap.width}
              map={world.jumpAreaMap}
              selectedSystem={selectedJumpAreaSystem}
            />
          </div>
        ) : (
          <div className="navigation-content">
            <SensorMap scan={world.localSectorScan} />
            <LocalScanReadout
              elapsedMilliseconds={elapsedMilliseconds}
              scan={world.localSectorScan}
              sortedContacts={sortedContacts}
            />
          </div>
        )}
      </div>
    </section>
  )
}

function LongRangeMapView({
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

function StellarReadout({
  elapsedMilliseconds,
  extentLabel,
  extentValue,
  map,
  selectedSystem,
}: {
  elapsedMilliseconds: number
  extentLabel: string
  extentValue: number
  map: StellarMap
  selectedSystem: StellarSystem | null
}) {
  return (
    <aside className="stellar-readout" aria-label="Stellar system details">
      <div className="scan-summary">
        <div>
          <span>{extentLabel}</span>
          <strong>{formatDistance(extentValue, map.distanceUnit)}</strong>
        </div>
        <div>
          <span>Systems</span>
          <strong>{map.systems.length}</strong>
        </div>
        <div>
          <span>Clock</span>
          <strong>{formatElapsed(elapsedMilliseconds)}</strong>
        </div>
      </div>

      {selectedSystem ? (
        <article className="stellar-detail">
          <header className="stellar-detail-header">
            <span>{formatSystemRole(selectedSystem.role)}</span>
            <h3>{selectedSystem.name}</h3>
          </header>

          <dl className="stellar-detail-list">
            <div>
              <dt>Star Type</dt>
              <dd>{selectedSystem.starType}</dd>
            </div>
            <div>
              <dt>Star Size</dt>
              <dd>{formatStarSize(selectedSystem.starSizeSolarRadii)}</dd>
            </div>
            <div>
              <dt>Range</dt>
              <dd>{formatDistance(selectedSystem.distance, map.distanceUnit)}</dd>
            </div>
            <div>
              <dt>Planets</dt>
              <dd>{selectedSystem.planetCountPrediction} predicted</dd>
            </div>
            <div>
              <dt>Accuracy</dt>
              <dd>{formatPercent(selectedSystem.planetCountAccuracy)}</dd>
            </div>
          </dl>

          <div className="resource-detection-panel">
            <span>Resource Signals</span>
            <ul className="resource-detections">
              {selectedSystem.resourceDetections.map((detection) => (
                <li
                  data-detected={detection.detected}
                  key={detection.resource}
                >
                  <span>{formatResourceName(detection.resource)}</span>
                  <strong>
                    {detection.detected ? 'Detected' : 'No signal'}
                  </strong>
                  <small>{formatPercent(detection.confidence)}</small>
                </li>
              ))}
            </ul>
          </div>
        </article>
      ) : (
        <div className="stellar-detail stellar-detail--empty">
          <span>Selection</span>
          <strong>No system selected</strong>
        </div>
      )}
    </aside>
  )
}

function LocalScanReadout({
  elapsedMilliseconds,
  scan,
  sortedContacts,
}: {
  elapsedMilliseconds: number
  scan: SensorScan
  sortedContacts: SensorContact[]
}) {
  return (
    <aside className="scan-readout" aria-label="Detected contacts">
      <div className="scan-summary">
        <div>
          <span>Radius</span>
          <strong>{formatDistance(scan.radius, scan.distanceUnit)}</strong>
        </div>
        <div>
          <span>Contacts</span>
          <strong>{scan.contacts.length}</strong>
        </div>
        <div>
          <span>Clock</span>
          <strong>{formatElapsed(elapsedMilliseconds)}</strong>
        </div>
      </div>

      <ol className="contact-list">
        {sortedContacts.map((contact) => (
          <li className="contact-row" key={contact.id}>
            <span
              aria-hidden="true"
              className="contact-token"
              data-kind={contact.kind}
            />
            <div>
              <strong>{contact.name}</strong>
              <span>{contact.asteroidTypeLabel}</span>
            </div>
            <dl>
              <div>
                <dt>Range</dt>
                <dd>{formatDistance(contact.distance, scan.distanceUnit)}</dd>
              </div>
              <div>
                <dt>Seen</dt>
                <dd>{formatSignalAge(contact.signalAgeSeconds)}</dd>
              </div>
            </dl>
            {contact.resourceEstimates.length > 0 && (
              <ul className="resource-estimates">
                {contact.resourceEstimates.map((estimate) => (
                  <li key={estimate.resource}>
                    <span>{formatResourceName(estimate.resource)}</span>
                    <strong>{formatResourceEstimate(estimate)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </aside>
  )
}

function SensorMap({ scan }: { scan: SensorScan }) {
  return (
    <div className="sensor-map" aria-label={`${scan.label} map`}>
      <svg role="img" viewBox="0 0 100 100">
        <title>{scan.label}</title>
        <circle
          className="sensor-range sensor-range--outer"
          cx="50"
          cy="50"
          r="42"
        />
        <circle className="sensor-range" cx="50" cy="50" r="28" />
        <circle className="sensor-range" cx="50" cy="50" r="14" />
        <path className="sensor-axis" d="M50 5v90M5 50h90" />
        <circle className="ship-marker" cx="50" cy="50" r="2.8" />
        {scan.contacts.map((contact) => (
          <ContactMarker contact={contact} key={contact.id} scan={scan} />
        ))}
      </svg>
    </div>
  )
}

function ContactMarker({
  contact,
  scan,
}: {
  contact: SensorContact
  scan: SensorScan
}) {
  const point = toMapPoint(contact, scan.radius)
  const markerRadius = Math.max(1.4, 2.6 * contact.markerScale)

  return (
    <g className="sensor-contact" data-kind={contact.kind}>
      <circle cx={point.x} cy={point.y} r={markerRadius + 2.6} />
      <circle cx={point.x} cy={point.y} r={markerRadius} />
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

function getInitialSectorViewport(map: StellarMap): SectorViewport {
  return {
    centerX: map.width / 2,
    centerY: map.height / 2,
    zoom: 1,
  }
}

function getMapCenterPosition(map: StellarMap): MapPosition {
  return {
    x: map.width / 2,
    y: map.height / 2,
  }
}

function buildSectorGridLines(
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

function getSectorBaseSpan(map: StellarMap) {
  return Math.max(map.width, map.height)
}

function getMaximumSectorZoom(map: StellarMap, minimumViewSpan: number) {
  return Math.max(1, getSectorBaseSpan(map) / minimumViewSpan)
}

function getSectorViewSpan(map: StellarMap, zoom: number) {
  return getSectorBaseSpan(map) / zoom
}

function getStellarGizmoScale(
  map: StellarMap,
  zoom: number,
  referenceSpan: number,
) {
  return getSectorBaseSpan(map) / Math.max(referenceSpan, 0.000001) / zoom
}

function zoomSectorViewport(
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

function constrainSectorViewport(
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

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function toSectorMapPoint(position: MapPosition, map: StellarMap) {
  return {
    x: clamp(position.x, 0, map.width),
    y: clamp(map.height - position.y, 0, map.height),
  }
}

function getMapDiagonal(map: StellarMap) {
  return Math.sqrt((map.width * map.width) + (map.height * map.height))
}

function toMapPoint(contact: SensorContact, radius: number) {
  const x = mapCenter + (contact.x / radius) * mapRadius
  const y = mapCenter - (contact.y / radius) * mapRadius

  return {
    x: Math.max(6, Math.min(94, x)),
    y: Math.max(6, Math.min(94, y)),
  }
}

function formatDistance(value: number, distanceUnit: DistanceUnit) {
  if (distanceUnit === 'lightYear') {
    return `${value.toFixed(value >= 1 ? 2 : 3)} ly`
  }

  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value)} km`
}

function formatMapScale(value: number, distanceUnit: DistanceUnit) {
  if (distanceUnit === 'lightYear') {
    return `${value.toFixed(value >= 10 ? 0 : value >= 2 ? 1 : 2)} ly`
  }

  return formatDistance(value, distanceUnit)
}

function formatSignalAge(seconds: number) {
  const years = seconds / 31_557_600

  if (years >= 1) {
    return `${years.toFixed(2)} yr ago`
  }

  const days = seconds / 86_400

  if (days >= 1) {
    return `${days.toFixed(1)} d ago`
  }

  if (seconds >= 1) {
    return `${seconds.toFixed(1)} s ago`
  }

  return `${Math.max(1, Math.round(seconds * 1000))} ms ago`
}

function formatResourceEstimate({
  label,
  maximum,
  minimum,
}: SensorContact['resourceEstimates'][number]) {
  if (minimum === 0 && maximum === 0) {
    return 'none'
  }

  return `${label} ${Math.round(minimum * 100)}-${Math.round(maximum * 100)}%`
}

function formatResourceName(resource: string) {
  return resource.charAt(0).toUpperCase() + resource.slice(1)
}

function formatStarSize(starSizeSolarRadii: number) {
  return `${starSizeSolarRadii.toFixed(2)} solar radii`
}

function getSpectralType(starType: string) {
  const spectralType = starType.charAt(0).toLowerCase()

  if (
    spectralType === 'o' ||
    spectralType === 'b' ||
    spectralType === 'a' ||
    spectralType === 'f' ||
    spectralType === 'g' ||
    spectralType === 'k' ||
    spectralType === 'm'
  ) {
    return spectralType
  }

  return 'unknown'
}

function formatSystemRole(role: StellarSystem['role']) {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function formatElapsed(elapsedMilliseconds: number) {
  const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000)
  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
