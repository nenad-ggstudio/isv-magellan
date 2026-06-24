import type { Ship, StorageUnit } from '../../../gameTypes'
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

type ShipStatusProps = {
  ship: Ship
}

export function ShipStatus({ ship }: ShipStatusProps) {
  const shipReadouts = [
    ['Hull', 'Nominal'],
    ['Battery', formatPercentage(ship.batteryBank.chargeLevel)],
    ['Reactor', '82%'],
    ['Engines', 'Standby'],
  ]
  const occupiedUnits = ship.storageUnits.filter((unit) => unit.contents).length
  const storedKilograms = ship.storageUnits.reduce(
    (total, unit) => total + (unit.contents?.quantityKilograms ?? 0),
    0,
  )
  const totalCapacityKilograms = ship.storageUnits.reduce(
    (total, unit) => total + unit.capacityKilograms,
    0,
  )

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
      <dl className={panelReadout}>
        {shipReadouts.map(([label, value]) => (
          <div className={panelReadoutRow} key={label}>
            <dt className={panelReadoutTerm}>{label}</dt>
            <dd className={panelReadoutDescription}>{value}</dd>
          </div>
        ))}
      </dl>
      <details className="group grid gap-2.5 rounded border border-[#142840] bg-[rgb(3_8_14_/_60%)] p-0">
        <summary className="flex min-h-[42px] cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-medium uppercase tracking-[0.1em] text-[#6a9aac] [&::-webkit-details-marker]:hidden hover:text-[#b4d4e4] transition-colors">
          <span>Cargo Hold</span>
          <span className="flex items-center gap-2">
            <strong className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#3a5c6e] tabular-nums">
              {occupiedUnits}/{ship.storageUnits.length} units
            </strong>
            <span className="text-sm leading-none text-[#3a5c6e] group-open:hidden">
              +
            </span>
            <span className="hidden text-sm leading-none text-[#3a5c6e] group-open:inline">
              −
            </span>
          </span>
        </summary>
        <div className="flex justify-between gap-3 border-t border-[#0c1c2c] px-3 pt-[11px]">
          <span className="text-[10px] uppercase tracking-[0.14em] text-[#3a5c6e]">Stored</span>
          <strong className="text-[11px] tabular-nums text-[#c8dfe8]">
            {formatKilograms(storedKilograms)} /{' '}
            {formatKilograms(totalCapacityKilograms)}
          </strong>
        </div>
        <ol className="m-0 grid max-h-[440px] list-none gap-2 overflow-auto px-3 pb-3 [scrollbar-color:#1e3c58_transparent] [scrollbar-width:thin]">
          {ship.storageUnits.map((unit) => (
            <StorageUnitRow key={unit.slotNumber} unit={unit} />
          ))}
        </ol>
      </details>
    </aside>
  )
}

function StorageUnitRow({ unit }: { unit: StorageUnit }) {
  const fillPercentage =
    unit.contents === null
      ? 0
      : Math.min(100, (unit.contents.quantityKilograms / unit.capacityKilograms) * 100)

  return (
    <li className="grid gap-[7px] rounded border border-[#0c1c2c] bg-[rgb(2_6_12_/_70%)] p-[9px]">
      <div className="flex justify-between gap-2.5">
        <span className="text-[10px] uppercase tracking-[0.12em] text-[#3a5c6e]">
          Unit {unit.slotNumber}
        </span>
        <strong className="text-[11px] font-medium text-[#b4d4e4]">
          {unit.contents
            ? formatResourceName(unit.contents.resource)
            : 'Empty'}
        </strong>
      </div>
      <div
        className="h-[3px] overflow-hidden rounded-full bg-[#0c1c2c]"
        aria-hidden="true"
      >
        <span
          className="block h-full rounded-[inherit] bg-[#00c4e8] [box-shadow:0_0_6px_rgba(0,196,232,0.5)]"
          style={{ width: `${fillPercentage}%` }}
        />
      </div>
      <dl className="m-0 grid grid-cols-2 gap-2">
        <div>
          <dt className="text-[10px] uppercase text-[#7f999a]">Mass</dt>
          <dd className="m-0 mt-px text-xs text-[#dce7e5]">
            {formatKilograms(unit.contents?.quantityKilograms ?? 0)} /{' '}
            {formatKilograms(unit.capacityKilograms)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase text-[#7f999a]">Purity</dt>
          <dd className="m-0 mt-px text-xs text-[#dce7e5]">
            {unit.contents
              ? formatPurity(unit.contents.purityLevel)
              : 'N/A'}
          </dd>
        </div>
      </dl>
    </li>
  )
}

function formatKilograms(kilograms: number) {
  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(kilograms)} kg`
}

function formatPurity(purityLevel: number) {
  return `${Math.round(purityLevel * 100)}%`
}

function formatPercentage(value: number) {
  return `${Math.round(value * 1000) / 10}%`
}

function formatResourceName(resource: string) {
  return resource.charAt(0).toUpperCase() + resource.slice(1)
}
