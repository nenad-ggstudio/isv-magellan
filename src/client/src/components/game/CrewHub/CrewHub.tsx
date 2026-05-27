import { cx } from '../../../classNames'
import {
  panelHeading,
  panelLabel,
  panelReadout,
  panelReadoutDescription,
  panelReadoutRow,
  panelReadoutTerm,
  panelSurface,
  sidePanel,
} from '../styleClasses'

const crewReadouts = [
  ['Crew', '12'],
  ['Morale', 'Steady'],
  ['Assignment', 'Survey'],
]

export function CrewHub() {
  return (
    <aside
      className={cx(
        panelSurface,
        sidePanel,
        'border-r [grid-area:crew] max-[800px]:border-x-0 max-[800px]:border-t',
      )}
    >
      <div>
        <span className={panelLabel}>Crew</span>
        <h2 className={panelHeading}>Crew Hub</h2>
      </div>
      <dl className={panelReadout}>
        {crewReadouts.map(([label, value]) => (
          <div className={panelReadoutRow} key={label}>
            <dt className={panelReadoutTerm}>{label}</dt>
            <dd className={panelReadoutDescription}>{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  )
}
