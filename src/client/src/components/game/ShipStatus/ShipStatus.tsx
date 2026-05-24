import type { Ship, StorageUnit } from '../../../gameTypes'

const shipReadouts = [
  ['Hull', 'Nominal'],
  ['Reactor', '82%'],
  ['Engines', 'Standby'],
]

type ShipStatusProps = {
  ship: Ship
}

export function ShipStatus({ ship }: ShipStatusProps) {
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
    <aside className="side-panel ship-status">
      <div>
        <span className="panel-label">Systems</span>
        <h2>{ship.name}</h2>
      </div>
      <dl className="panel-readout">
        {shipReadouts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <details className="cargo-hold">
        <summary>
          <span>Cargo Hold</span>
          <strong>
            {occupiedUnits}/{ship.storageUnits.length} units
          </strong>
        </summary>
        <div className="cargo-overview">
          <span>Stored</span>
          <strong>
            {formatKilograms(storedKilograms)} /{' '}
            {formatKilograms(totalCapacityKilograms)}
          </strong>
        </div>
        <ol className="storage-unit-list">
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
    <li className="storage-unit-row">
      <div>
        <span>Unit {unit.slotNumber}</span>
        <strong>
          {unit.contents
            ? formatResourceName(unit.contents.resource)
            : 'Empty'}
        </strong>
      </div>
      <div className="storage-meter" aria-hidden="true">
        <span style={{ width: `${fillPercentage}%` }} />
      </div>
      <dl>
        <div>
          <dt>Mass</dt>
          <dd>
            {formatKilograms(unit.contents?.quantityKilograms ?? 0)} /{' '}
            {formatKilograms(unit.capacityKilograms)}
          </dd>
        </div>
        <div>
          <dt>Purity</dt>
          <dd>
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

function formatResourceName(resource: string) {
  return resource.charAt(0).toUpperCase() + resource.slice(1)
}
