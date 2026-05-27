import type { LocalMap } from '../../../gameTypes'
import { cx } from '../../../classNames'
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
import {
  detailDescription,
  detailEyebrow,
  detailHeader,
  detailList,
  detailListItem,
  detailPanel,
  detailTerm,
  detailTitle,
  emptyDetailLabel,
  emptyDetailPanel,
  emptyDetailValue,
  readoutShell,
  resourceLabel,
  resourceList,
  resourceListItem,
  resourcePanel,
  resourceValue,
  scanSummary,
  scanSummaryItem,
  scanSummaryLabel,
  scanSummaryValue,
} from '../styleClasses'

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
    <aside className={readoutShell} aria-label="Local contacts">
      <div className={scanSummary}>
        <div className={scanSummaryItem}>
          <span className={scanSummaryLabel}>Radius</span>
          <strong className={scanSummaryValue}>
            {formatDistance(map.radius, map.distanceUnit)}
          </strong>
        </div>
        <div className={scanSummaryItem}>
          <span className={scanSummaryLabel}>Contacts</span>
          <strong className={scanSummaryValue}>{map.contacts.length}</strong>
        </div>
        <div className={scanSummaryItem}>
          <span className={scanSummaryLabel}>Clock</span>
          <strong className={scanSummaryValue}>
            {formatElapsed(elapsedMilliseconds)}
          </strong>
        </div>
      </div>

      {selectedContact ? (
        <article className={detailPanel} aria-live="polite">
          <header className={detailHeader}>
            <span className={detailEyebrow}>
              {selectedContact.contact.asteroidTypeLabel}
            </span>
            <h3 className={detailTitle}>{selectedContact.contact.name}</h3>
          </header>

          <dl className={detailList}>
            <div className={detailListItem}>
              <dt className={detailTerm}>Range</dt>
              <dd className={detailDescription}>
                {formatDistance(selectedContact.distance, map.distanceUnit)}
              </dd>
            </div>
            <div className={detailListItem}>
              <dt className={detailTerm}>Speed</dt>
              <dd className={detailDescription}>
                {formatSpeed(
                  selectedContact.contact.speedKilometersPerSecond,
                )}
              </dd>
            </div>
            <div className={detailListItem}>
              <dt className={detailTerm}>Direction</dt>
              <dd className={detailDescription}>
                {formatDirection(selectedContact.contact.directionDegrees)}
              </dd>
            </div>
            <div className={detailListItem}>
              <dt className={detailTerm}>Relative Position</dt>
              <dd className={detailDescription}>
                {formatCoordinates(selectedContact.x, selectedContact.y)}
              </dd>
            </div>
            <div className={detailListItem}>
              <dt className={detailTerm}>Seen</dt>
              <dd className={detailDescription}>
                {formatSignalAge(selectedContact.signalAgeSeconds)}
              </dd>
            </div>
          </dl>

          {selectedContact.contact.resourceEstimates.length > 0 && (
            <div className={resourcePanel}>
              <span className={resourceLabel}>Resource Estimates</span>
              <ul className={resourceList}>
                {selectedContact.contact.resourceEstimates.map((estimate) => (
                  <li className={resourceListItem} key={estimate.resource}>
                    <span className={resourceLabel}>
                      {formatResourceName(estimate.resource)}
                    </span>
                    <strong className={resourceValue}>
                      {formatResourceEstimate(estimate)}
                    </strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
      ) : (
        <div className={cx(detailPanel, emptyDetailPanel)}>
          <span className={emptyDetailLabel}>Selection</span>
          <strong className={emptyDetailValue}>No contact selected</strong>
        </div>
      )}
    </aside>
  )
}
