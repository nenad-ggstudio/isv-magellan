import type { JumpDrive } from '../../../gameTypes'
import { ShipSystemMetric, ShipSystemSection } from './ShipSystemSection'

export function JumpDriveSystem({ jumpDrive }: { jumpDrive: JumpDrive }) {
  return (
    <ShipSystemSection
      summary={`${formatNumber(jumpDrive.maximumDistanceLightYears)} ly max`}
      title={jumpDrive.label}
    >
      <dl className="m-0 grid gap-2">
        <ShipSystemMetric
          label="Maximum range"
          value={`${formatNumber(jumpDrive.maximumDistanceLightYears)} ly`}
        />
        <ShipSystemMetric
          label="D2 ignition"
          value={formatKilograms(jumpDrive.deuteriumIgnitionCostKilograms)}
        />
        <ShipSystemMetric
          label="D2 travel"
          value={`${formatKilograms(jumpDrive.deuteriumTravelCostKilogramsPerLightYear)} / ly`}
        />
        <ShipSystemMetric
          label="T2 ignition"
          value={formatKilograms(jumpDrive.tritiumIgnitionCostKilograms)}
        />
        <ShipSystemMetric
          label="T2 travel"
          value={`${formatKilograms(jumpDrive.tritiumTravelCostKilogramsPerLightYear)} / ly`}
        />
      </dl>
    </ShipSystemSection>
  )
}

function formatKilograms(kilograms: number) {
  return `${formatNumber(kilograms)} kg`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value)
}
