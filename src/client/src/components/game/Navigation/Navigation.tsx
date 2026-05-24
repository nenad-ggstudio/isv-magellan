import { useMemo, useState } from 'react'
import type { GameWorld, SensorContact, SensorScan } from '../../../gameTypes'

type NavigationProps = {
  elapsedMilliseconds: number
  world: GameWorld
}

type ScanMode = 'long-range' | 'local-sector'

const scanModes: Array<{ id: ScanMode; label: string }> = [
  { id: 'long-range', label: 'Long Range' },
  { id: 'local-sector', label: 'Local Sector' },
]

const mapCenter = 50
const mapRadius = 42

export function Navigation({ elapsedMilliseconds, world }: NavigationProps) {
  const [mode, setMode] = useState<ScanMode>('long-range')
  const activeScan =
    mode === 'long-range' ? world.longRangeScan : world.localSectorScan
  const sortedContacts = useMemo(
    () =>
      [...activeScan.contacts].sort(
        (firstContact, secondContact) =>
          firstContact.distance - secondContact.distance,
      ),
    [activeScan.contacts],
  )

  return (
    <section className="navigation-panel" aria-label="Navigation">
      <div className="navigation-shell">
        <header className="navigation-header">
          <div>
            <span className="panel-label">Navigation</span>
            <h2>{activeScan.label}</h2>
          </div>
          <div className="scan-tabs" role="tablist" aria-label="Sensor range">
            {scanModes.map((scanMode) => (
              <button
                aria-selected={scanMode.id === mode}
                className="scan-tab"
                key={scanMode.id}
                onClick={() => setMode(scanMode.id)}
                role="tab"
                type="button"
              >
                {scanMode.label}
              </button>
            ))}
          </div>
        </header>

        <div className="navigation-content">
          <SensorMap scan={activeScan} />

          <aside className="scan-readout" aria-label="Detected contacts">
            <div className="scan-summary">
              <div>
                <span>Radius</span>
                <strong>{formatDistance(activeScan.radius, activeScan)}</strong>
              </div>
              <div>
                <span>Contacts</span>
                <strong>{activeScan.contacts.length}</strong>
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
                      <dd>{formatDistance(contact.distance, activeScan)}</dd>
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
        </div>
      </div>
    </section>
  )
}

function SensorMap({ scan }: { scan: SensorScan }) {
  return (
    <div className="sensor-map" aria-label={`${scan.label} map`}>
      <svg role="img" viewBox="0 0 100 100">
        <title>{scan.label}</title>
        <circle className="sensor-range sensor-range--outer" cx="50" cy="50" r="42" />
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

function toMapPoint(contact: SensorContact, radius: number) {
  const x = mapCenter + (contact.x / radius) * mapRadius
  const y = mapCenter - (contact.y / radius) * mapRadius

  return {
    x: Math.max(6, Math.min(94, x)),
    y: Math.max(6, Math.min(94, y)),
  }
}

function formatDistance(value: number, scan: SensorScan) {
  if (scan.distanceUnit === 'lightYear') {
    return `${value.toFixed(value >= 1 ? 2 : 3)} ly`
  }

  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value)} km`
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

function formatElapsed(elapsedMilliseconds: number) {
  const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000)
  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
