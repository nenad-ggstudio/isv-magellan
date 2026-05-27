import type { LocalMap } from '../../../gameTypes'
import {
  formatCoordinates,
  formatDirection,
  formatDistance,
  formatElapsed,
  formatResourceEstimate,
  formatResourceName,
  formatSignalAge,
  formatSpeed,
} from './formatters'
import type { LocalMapContactPosition } from './types'

export function LocalMapReadout({
  elapsedMilliseconds,
  map,
  selectedContact,
}: {
  elapsedMilliseconds: number
  map: LocalMap
  selectedContact: LocalMapContactPosition | null
}) {
  return (
    <aside className="scan-readout" aria-label="Local contacts">
      <div className="scan-summary">
        <div>
          <span>Radius</span>
          <strong>{formatDistance(map.radius, map.distanceUnit)}</strong>
        </div>
        <div>
          <span>Contacts</span>
          <strong>{map.contacts.length}</strong>
        </div>
        <div>
          <span>Clock</span>
          <strong>{formatElapsed(elapsedMilliseconds)}</strong>
        </div>
      </div>

      {selectedContact ? (
        <article className="stellar-detail" aria-live="polite">
          <header className="stellar-detail-header">
            <span>{selectedContact.contact.asteroidTypeLabel}</span>
            <h3>{selectedContact.contact.name}</h3>
          </header>

          <dl className="stellar-detail-list">
            <div>
              <dt>Range</dt>
              <dd>
                {formatDistance(selectedContact.distance, map.distanceUnit)}
              </dd>
            </div>
            <div>
              <dt>Speed</dt>
              <dd>
                {formatSpeed(
                  selectedContact.contact.speedKilometersPerSecond,
                )}
              </dd>
            </div>
            <div>
              <dt>Direction</dt>
              <dd>
                {formatDirection(selectedContact.contact.directionDegrees)}
              </dd>
            </div>
            <div>
              <dt>Relative Position</dt>
              <dd>{formatCoordinates(selectedContact.x, selectedContact.y)}</dd>
            </div>
            <div>
              <dt>Seen</dt>
              <dd>{formatSignalAge(selectedContact.signalAgeSeconds)}</dd>
            </div>
          </dl>

          {selectedContact.contact.resourceEstimates.length > 0 && (
            <div className="resource-detection-panel">
              <span>Resource Estimates</span>
              <ul className="resource-detections">
                {selectedContact.contact.resourceEstimates.map((estimate) => (
                  <li key={estimate.resource}>
                    <span>{formatResourceName(estimate.resource)}</span>
                    <strong>{formatResourceEstimate(estimate)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
      ) : (
        <div className="stellar-detail stellar-detail--empty">
          <span>Selection</span>
          <strong>No contact selected</strong>
        </div>
      )}
    </aside>
  )
}
