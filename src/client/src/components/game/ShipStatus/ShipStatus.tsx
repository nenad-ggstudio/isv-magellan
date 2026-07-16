import type { Ship } from '../../../gameTypes'
import { cx } from '../../../classNames'
import { panelHeading, panelLabel, panelSurface, sidePanel } from '../styleClasses'
import { CargoHoldSystem } from './CargoHoldSystem'
import { FusionCoreSystem } from './FusionCoreSystem'
import { JumpDriveSystem } from './JumpDriveSystem'

type ShipStatusProps = {
  ship: Ship
}

export function ShipStatus({ ship }: ShipStatusProps) {
  return (
    <aside
      className={cx(
        panelSurface,
        sidePanel,
        'border-l [grid-area:ship] max-[800px]:border-x-0 max-[800px]:border-t',
      )}
    >
      <div>
        <span className={panelLabel}>Systems</span>
        <h2 className={panelHeading}>{ship.name}</h2>
      </div>

      <div className="grid gap-2.5">
        <FusionCoreSystem fusionCore={ship.fusionCore} />
        <JumpDriveSystem jumpDrive={ship.jumpDrive} />
        <CargoHoldSystem storageUnits={ship.storageUnits} />
      </div>
    </aside>
  )
}
