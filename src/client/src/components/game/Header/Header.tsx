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
          <img
            className="system-card-icon"
            src="/fusion-core-icon.svg"
            alt=""
            aria-hidden="true"
          />
          <dl>
            <div>
              <dt>
                D2 ({formatPurity(game.ship.fusionCore.deuteriumReservoir.purityLevel)})
              </dt>
              <dd>{formatKilogramFill(game.ship.fusionCore.deuteriumReservoir)}</dd>
            </div>
            <div>
              <dt>
                T2 ({formatPurity(game.ship.fusionCore.tritiumReservoir.purityLevel)})
              </dt>
              <dd>{formatKilogramFill(game.ship.fusionCore.tritiumReservoir)}</dd>
            </div>
            <div>
              <dt>H2O ({formatPurity(game.ship.fusionCore.coolantTank.purityLevel)})</dt>
              <dd>{formatTonFill(game.ship.fusionCore.coolantTank)}</dd>
            </div>
          </dl>
        </section>
        <section className="system-card" aria-label="Battery bank status">
          <img
            className="system-card-icon"
            src="/batery-bank-icon.svg"
            alt=""
            aria-hidden="true"
          />
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

function formatKilogramFill({
  capacityKilograms,
  quantityKilograms,
}: {
  capacityKilograms: number
  quantityKilograms: number
}) {
  return `${Math.round(quantityKilograms)}/${Math.round(capacityKilograms)} kg`
}

function formatTonFill({
  capacityKilograms,
  quantityKilograms,
}: {
  capacityKilograms: number
  quantityKilograms: number
}) {
  return `${formatTons(quantityKilograms)}/${formatTons(capacityKilograms)} t`
}

function formatTons(kilograms: number) {
  const tons = kilograms / 1_000

  return Number.isInteger(tons) ? String(tons) : tons.toFixed(1)
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
