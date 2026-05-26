import { useMemo, useState } from 'react'
import type { KeyboardEvent, PointerEvent, WheelEvent } from 'react'
import type {
  DistanceUnit,
  GameWorld,
  LongRangeMap,
  SensorContact,
  SensorScan,
  StellarSystem,
} from '../../../gameTypes'

type NavigationProps = {
  elapsedMilliseconds: number
  world: GameWorld
}

type NavigationMode = 'long-range-map' | 'local-sector'

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
  { id: 'local-sector', label: 'Local Scan' },
]

const mapCenter = 50
const mapRadius = 42
const sectorMinimumViewLightYears = 1
const sectorZoomMultiplier = 1.6

export function Navigation({ elapsedMilliseconds, world }: NavigationProps) {
  const [mode, setMode] = useState<NavigationMode>('long-range-map')
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null)
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
  const activeLabel =
    mode === 'long-range-map'
      ? world.longRangeMap.label
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
              map={world.longRangeMap}
              onSelectSystem={setSelectedSystemId}
              selectedSystemId={selectedSystemId}
              shipPosition={world.shipPosition}
            />
            <LongRangeReadout
              elapsedMilliseconds={elapsedMilliseconds}
              map={world.longRangeMap}
              selectedSystem={selectedSystem}
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
  map,
  onSelectSystem,
  selectedSystemId,
  shipPosition,
}: {
  map: LongRangeMap
  onSelectSystem: (systemId: string) => void
  selectedSystemId: string | null
  shipPosition: GameWorld['shipPosition']
}) {
  const [viewport, setViewport] = useState(() =>
    getInitialSectorViewport(map),
  )
  const [dragState, setDragState] = useState<DragState | null>(null)
  const constrainedViewport = constrainSectorViewport(map, viewport)
  const viewSpan = getSectorViewSpan(map, constrainedViewport.zoom)
  const viewLeft = constrainedViewport.centerX - viewSpan / 2
  const viewTop = constrainedViewport.centerY - viewSpan / 2
  const gridLines = useMemo(() => buildSectorGridLines(map), [map])
  const zoomInDisabled =
    constrainedViewport.zoom >= getMaximumSectorZoom(map)
  const zoomOutDisabled = constrainedViewport.zoom <= 1

  function changeZoom(multiplier: number) {
    setViewport((currentViewport) =>
      zoomSectorViewport(
        map,
        currentViewport,
        currentViewport.zoom * multiplier,
      ),
    )
  }

  function resetViewport() {
    setViewport(getInitialSectorViewport(map))
  }

  function zoomToShip() {
    setViewport(
      constrainSectorViewport(map, {
        centerX: shipPosition.x,
        centerY: map.height - shipPosition.y,
        zoom: getMaximumSectorZoom(map),
      }),
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
      zoomSectorViewport(map, currentViewport, nextZoom, focus),
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
      const current = constrainSectorViewport(map, currentViewport)
      const currentViewSpan = getSectorViewSpan(map, current.zoom)

      return constrainSectorViewport(map, {
        ...current,
        centerX: current.centerX - (deltaX / bounds.width) * currentViewSpan,
        centerY: current.centerY - (deltaY / bounds.height) * currentViewSpan,
      })
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
            zoom={constrainedViewport.zoom}
          />
        ))}
      </svg>
    </div>
  )
}

function StellarSystemMarker({
  map,
  onSelectSystem,
  selected,
  system,
  zoom,
}: {
  map: LongRangeMap
  onSelectSystem: (systemId: string) => void
  selected: boolean
  system: StellarSystem
  zoom: number
}) {
  const point = toSectorMapPoint(system, map)
  const markerScale = 1 / zoom
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

function LongRangeReadout({
  elapsedMilliseconds,
  map,
  selectedSystem,
}: {
  elapsedMilliseconds: number
  map: LongRangeMap
  selectedSystem: StellarSystem | null
}) {
  const diagonal = Math.sqrt(
    map.width * map.width + map.height * map.height,
  )

  return (
    <aside className="stellar-readout" aria-label="Stellar system details">
      <div className="scan-summary">
        <div>
          <span>Sector</span>
          <strong>{formatDistance(diagonal, map.distanceUnit)}</strong>
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

function getInitialSectorViewport(map: LongRangeMap): SectorViewport {
  return {
    centerX: map.width / 2,
    centerY: map.height / 2,
    zoom: 1,
  }
}

function buildSectorGridLines(map: LongRangeMap): SectorGridLine[] {
  const lines: SectorGridLine[] = []

  for (let x = 0; x <= map.width; x += 1) {
    lines.push({
      id: `x-${x}`,
      major: x % 5 === 0 || x === map.width,
      x1: x,
      x2: x,
      y1: 0,
      y2: map.height,
    })
  }

  for (let y = 0; y <= map.height; y += 1) {
    lines.push({
      id: `y-${y}`,
      major: y % 5 === 0 || y === map.height,
      x1: 0,
      x2: map.width,
      y1: y,
      y2: y,
    })
  }

  return lines
}

function getSectorBaseSpan(map: LongRangeMap) {
  return Math.max(map.width, map.height)
}

function getMaximumSectorZoom(map: LongRangeMap) {
  return Math.max(1, getSectorBaseSpan(map) / sectorMinimumViewLightYears)
}

function getSectorViewSpan(map: LongRangeMap, zoom: number) {
  return getSectorBaseSpan(map) / zoom
}

function zoomSectorViewport(
  map: LongRangeMap,
  viewport: SectorViewport,
  nextZoom: number,
  focus?: { ratioX: number; ratioY: number },
) {
  const current = constrainSectorViewport(map, viewport)
  const zoom = clamp(nextZoom, 1, getMaximumSectorZoom(map))
  const currentSpan = getSectorViewSpan(map, current.zoom)
  const nextSpan = getSectorViewSpan(map, zoom)

  if (!focus) {
    return constrainSectorViewport(map, {
      ...current,
      zoom,
    })
  }

  const currentLeft = current.centerX - currentSpan / 2
  const currentTop = current.centerY - currentSpan / 2
  const focusX = currentLeft + focus.ratioX * currentSpan
  const focusY = currentTop + focus.ratioY * currentSpan

  return constrainSectorViewport(map, {
    centerX: focusX + (0.5 - focus.ratioX) * nextSpan,
    centerY: focusY + (0.5 - focus.ratioY) * nextSpan,
    zoom,
  })
}

function constrainSectorViewport(
  map: LongRangeMap,
  viewport: SectorViewport,
) {
  const zoom = clamp(viewport.zoom, 1, getMaximumSectorZoom(map))
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

function toSectorMapPoint(system: StellarSystem, map: LongRangeMap) {
  return {
    x: clamp(system.x, 0, map.width),
    y: clamp(map.height - system.y, 0, map.height),
  }
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
