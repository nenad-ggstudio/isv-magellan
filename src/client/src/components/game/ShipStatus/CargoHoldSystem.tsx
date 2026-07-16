import type { StorageUnit } from '../../../gameTypes'
import { ShipSystemSection } from './ShipSystemSection'

export function CargoHoldSystem({
  storageUnits,
}: {
  storageUnits: StorageUnit[]
}) {
  const occupiedUnits = storageUnits.filter((unit) => unit.contents).length
  const storedKilograms = storageUnits.reduce(
    (total, unit) => total + (unit.contents?.quantityKilograms ?? 0),
    0,
  )
  const totalCapacityKilograms = storageUnits.reduce(
    (total, unit) => total + unit.capacityKilograms,
    0,
  )

  return (
    <ShipSystemSection
      summary={`${occupiedUnits}/${storageUnits.length} units`}
      title="Cargo Hold"
    >
      <div className="flex justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.14em] text-[#3a5c6e]">
          Stored
        </span>
        <strong className="text-[11px] text-[#c8dfe8] tabular-nums">
          {formatKilograms(storedKilograms)} /{' '}
          {formatKilograms(totalCapacityKilograms)}
        </strong>
      </div>
      <ol className="m-0 grid max-h-[440px] list-none gap-2 overflow-auto p-0 [scrollbar-color:#1e3c58_transparent] [scrollbar-width:thin]">
        {storageUnits.map((unit) => (
          <StorageUnitRow key={unit.slotNumber} unit={unit} />
        ))}
      </ol>
    </ShipSystemSection>
  )
}

function StorageUnitRow({ unit }: { unit: StorageUnit }) {
  const fillPercentage =
    unit.contents === null
      ? 0
      : Math.min(
          100,
          (unit.contents.quantityKilograms / unit.capacityKilograms) * 100,
        )

  return (
    <li className="grid gap-[7px] rounded border border-[#0c1c2c] bg-[rgb(2_6_12_/_70%)] p-[9px]">
      <div className="flex justify-between gap-2.5">
        <span className="text-[10px] uppercase tracking-[0.12em] text-[#3a5c6e]">
          Unit {unit.slotNumber}
        </span>
        <strong className="text-[11px] font-medium text-[#b4d4e4]">
          {unit.contents ? formatResourceName(unit.contents.resource) : 'Empty'}
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
            {unit.contents ? formatPurity(unit.contents.purityLevel) : 'N/A'}
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
