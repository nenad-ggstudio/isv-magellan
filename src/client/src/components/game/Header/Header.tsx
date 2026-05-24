import type { ActiveGameState } from '../../../gameTypes'

type HeaderProps = {
  connectionState: string
  elapsedMilliseconds: number
  game: ActiveGameState
  tick: number
}

export function Header({
  connectionState,
  elapsedMilliseconds,
  game,
  tick,
}: HeaderProps) {
  return (
    <header className="game-header">
      <div className="header-title">
        <h1>{game.name}</h1>
        <span className="connection-state">
          {connectionState} / tick {tick} / {formatElapsed(elapsedMilliseconds)}
        </span>
      </div>
      <div className="ship-system-summary">
        <section className="system-card" aria-label="Fusion core reserves">
          <h2>Fusion Core</h2>
          <dl>
            <div>
              <dt>D2</dt>
              <dd>{formatReservoir(game.ship.fusionCore.deuteriumReservoir)}</dd>
            </div>
            <div>
              <dt>T2</dt>
              <dd>{formatReservoir(game.ship.fusionCore.tritiumReservoir)}</dd>
            </div>
            <div>
              <dt>H2O</dt>
              <dd>{formatCoolant(game.ship.fusionCore.coolantTank)}</dd>
            </div>
          </dl>
        </section>
        <section className="system-card" aria-label="Battery bank status">
          <h2>Battery Bank</h2>
          <dl>
            <div>
              <dt>Charge</dt>
              <dd>{formatPercentage(game.ship.batteryBank.chargeLevel)}</dd>
            </div>
            <div>
              <dt>Health</dt>
              <dd>{formatPercentage(game.ship.batteryBank.healthLevel)}</dd>
            </div>
            <div>
              <dt>Max</dt>
              <dd>{formatEnergy(game.ship.batteryBank.maxCapacityKilowattHours)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </header>
  )
}

function formatReservoir({
  purityLevel,
  quantityKilograms,
}: {
  purityLevel: number
  quantityKilograms: number
}) {
  return `${formatMass(quantityKilograms)} / ${formatPurity(purityLevel)}`
}

function formatCoolant({
  purityLevel,
  quantityKilograms,
}: {
  purityLevel: number
  quantityKilograms: number
}) {
  return `${formatMass(quantityKilograms)} / ${formatPurity(purityLevel)}`
}

function formatMass(kilograms: number) {
  if (kilograms >= 1_000) {
    return `${(kilograms / 1_000).toFixed(1)} t`
  }

  return `${Math.round(kilograms)} kg`
}

function formatPurity(purityLevel: number) {
  return formatPercentage(purityLevel)
}

function formatPercentage(value: number) {
  return `${Math.round(value * 100)}%`
}

function formatEnergy(kilowattHours: number) {
  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(kilowattHours)} kWh`
}

function formatElapsed(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')

  return `${minutes}:${seconds}`
}
