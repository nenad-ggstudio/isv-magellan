import type { StellarSystem } from '../../../gameTypes'
import {
  formatDistance,
  formatElapsed,
  formatPercent,
  formatResourceName,
  formatStarSize,
  formatSystemRole,
} from './formatters'
import type { StellarMap } from './types'

export function StellarReadout({
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
