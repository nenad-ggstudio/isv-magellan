import type { ReactNode } from 'react'
import type { StellarSystem } from '../../../gameTypes'
import { cx } from '../../../classNames'
import {
  formatDistance,
  formatElapsed,
  formatPercent,
  formatResourceName,
  formatStarSize,
  formatSystemRole,
} from './formatters'
import type { StellarMap } from './types'
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
  resourceMeta,
  resourcePanel,
  resourceValue,
  scanSummary,
  scanSummaryItem,
  scanSummaryLabel,
  scanSummaryValue,
} from '../styleClasses'

export function StellarReadout({
  children,
  elapsedMilliseconds,
  extentLabel,
  extentValue,
  map,
  selectedSystem,
}: {
  children?: ReactNode
  elapsedMilliseconds: number
  extentLabel: string
  extentValue: number
  map: StellarMap
  selectedSystem: StellarSystem | null
}) {
  return (
    <aside className={readoutShell} aria-label="Stellar system details">
      <div className="grid gap-3.5">
        <div className={scanSummary}>
          <div className={scanSummaryItem}>
            <span className={scanSummaryLabel}>{extentLabel}</span>
            <strong className={scanSummaryValue}>
              {formatDistance(extentValue, map.distanceUnit)}
            </strong>
          </div>
          <div className={scanSummaryItem}>
            <span className={scanSummaryLabel}>Systems</span>
            <strong className={scanSummaryValue}>{map.systems.length}</strong>
          </div>
          <div className={scanSummaryItem}>
            <span className={scanSummaryLabel}>Clock</span>
            <strong className={scanSummaryValue}>
              {formatElapsed(elapsedMilliseconds)}
            </strong>
          </div>
        </div>

        {children}
      </div>

      {selectedSystem ? (
        <article className={detailPanel}>
          <header className={detailHeader}>
            <span className={detailEyebrow}>
              {formatSystemRole(selectedSystem.role)}
            </span>
            <h3 className={detailTitle}>{selectedSystem.name}</h3>
          </header>

          <dl className={detailList}>
            <div className={detailListItem}>
              <dt className={detailTerm}>Star Type</dt>
              <dd className={detailDescription}>{selectedSystem.starType}</dd>
            </div>
            <div className={detailListItem}>
              <dt className={detailTerm}>Star Size</dt>
              <dd className={detailDescription}>
                {formatStarSize(selectedSystem.starSizeSolarRadii)}
              </dd>
            </div>
            <div className={detailListItem}>
              <dt className={detailTerm}>Range</dt>
              <dd className={detailDescription}>
                {formatDistance(selectedSystem.distance, map.distanceUnit)}
              </dd>
            </div>
            <div className={detailListItem}>
              <dt className={detailTerm}>Planets</dt>
              <dd className={detailDescription}>
                {selectedSystem.planetCountPrediction} predicted
              </dd>
            </div>
            <div className={detailListItem}>
              <dt className={detailTerm}>Accuracy</dt>
              <dd className={detailDescription}>
                {formatPercent(selectedSystem.planetCountAccuracy)}
              </dd>
            </div>
          </dl>

          <div className={resourcePanel}>
            <span className={resourceLabel}>Resource Signals</span>
            <ul className={resourceList}>
              {selectedSystem.resourceDetections.map((detection) => (
                <li
                  data-detected={detection.detected}
                  className={resourceListItem}
                  key={detection.resource}
                >
                  <span className={resourceLabel}>
                    {formatResourceName(detection.resource)}
                  </span>
                  <strong
                    className={cx(
                      resourceValue,
                      detection.detected && 'text-[#e5f6ce]',
                    )}
                  >
                    {detection.detected ? 'Detected' : 'No signal'}
                  </strong>
                  <small className={resourceMeta}>
                    {formatPercent(detection.confidence)}
                  </small>
                </li>
              ))}
            </ul>
          </div>
        </article>
      ) : (
        <div className={cx(detailPanel, emptyDetailPanel)}>
          <span className={emptyDetailLabel}>Selection</span>
          <strong className={emptyDetailValue}>No system selected</strong>
        </div>
      )}
    </aside>
  )
}
