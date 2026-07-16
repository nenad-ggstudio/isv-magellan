import type { FusionCore } from '../../../gameTypes'
import { ShipSystemSection } from './ShipSystemSection'

export function FusionCoreSystem({ fusionCore }: { fusionCore: FusionCore }) {
  const { coolantTank, deuteriumReservoir, tritiumReservoir } = fusionCore

  return (
    <ShipSystemSection
      initiallyOpen
      summary={`D2 ${formatCompactKilograms(deuteriumReservoir.quantityKilograms)} · T2 ${formatCompactKilograms(tritiumReservoir.quantityKilograms)}`}
      title="Fusion Core"
    >
      <ReservoirReadout
        capacityKilograms={deuteriumReservoir.capacityKilograms}
        label="Deuterium / D2"
        purityLevel={deuteriumReservoir.purityLevel}
        quantityKilograms={deuteriumReservoir.quantityKilograms}
      />
      <ReservoirReadout
        capacityKilograms={tritiumReservoir.capacityKilograms}
        label="Tritium / T2"
        purityLevel={tritiumReservoir.purityLevel}
        quantityKilograms={tritiumReservoir.quantityKilograms}
      />
      <ReservoirReadout
        capacityKilograms={coolantTank.capacityKilograms}
        label="Coolant / H2O"
        purityLevel={coolantTank.purityLevel}
        quantityKilograms={coolantTank.quantityKilograms}
      />
    </ShipSystemSection>
  )
}

function ReservoirReadout({
  capacityKilograms,
  label,
  purityLevel,
  quantityKilograms,
}: {
  capacityKilograms: number
  label: string
  purityLevel: number
  quantityKilograms: number
}) {
  const fillPercentage = Math.min(
    100,
    (quantityKilograms / capacityKilograms) * 100,
  )

  return (
    <section className="grid gap-2 rounded border border-[#0c1c2c] bg-[rgb(2_6_12_/_70%)] p-[9px]">
      <div className="flex items-baseline justify-between gap-2">
        <strong className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#7f999a]">
          {label}
        </strong>
        <span className="text-[10px] text-[#6a9aac] tabular-nums">
          {formatPurity(purityLevel)} pure
        </span>
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
      <span className="text-[11px] text-[#c8dfe8] tabular-nums">
        {formatMass(quantityKilograms)} / {formatMass(capacityKilograms)}
      </span>
    </section>
  )
}

function formatCompactKilograms(kilograms: number) {
  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(kilograms)} kg`
}

function formatMass(kilograms: number) {
  if (kilograms >= 1_000) {
    return `${new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 1,
    }).format(kilograms / 1_000)} t`
  }

  return formatCompactKilograms(kilograms)
}

function formatPurity(purityLevel: number) {
  return `${Math.round(purityLevel * 100)}%`
}
