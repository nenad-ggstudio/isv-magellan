import type { ActiveGameState } from '../../../gameTypes'
import { panelLabel, panelSurface } from '../styleClasses'

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
    <header
      className={`${panelSurface} flex items-center justify-between gap-5 border-b px-6 [grid-area:header] max-[800px]:flex-col max-[800px]:items-stretch max-[800px]:p-4`}
    >
      <div className="grid min-w-0 gap-[3px] text-left">
        <h1 className="m-0 text-lg font-bold tracking-normal text-[#f5fbfa]">
          {game.name}
        </h1>
        <span className="text-xs uppercase text-[#7d9798]">
          {connectionState} / tick {tick} / {formatElapsed(elapsedMilliseconds)}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2.5 max-[800px]:grid max-[800px]:w-full max-[800px]:grid-cols-1">
        <section
          className="flex min-w-0 items-center gap-3 rounded-md border border-[#273334] bg-[#0c1112] px-2.5 py-[7px] text-left max-[800px]:flex-col max-[800px]:items-start max-[800px]:gap-1.5"
          aria-label="Fusion core reserves"
        >
          <img
            className="h-[26px] w-[26px] shrink-0 [filter:invert(92%)_sepia(11%)_saturate(165%)_hue-rotate(125deg)_brightness(104%)_contrast(95%)]"
            src="/fusion-core-icon.svg"
            alt=""
            aria-hidden="true"
          />
          <dl className="m-0 flex min-w-0 items-center gap-2.5 max-[800px]:grid max-[800px]:w-full max-[800px]:grid-cols-3">
            <div className="grid min-w-[58px] gap-px">
              <dt className={panelLabel}>
                D2 ({formatPurity(game.ship.fusionCore.deuteriumReservoir.purityLevel)})
              </dt>
              <dd className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-[650] text-[#f4f7f7]">
                {formatKilogramFill(game.ship.fusionCore.deuteriumReservoir)}
              </dd>
            </div>
            <div className="grid min-w-[58px] gap-px">
              <dt className={panelLabel}>
                T2 ({formatPurity(game.ship.fusionCore.tritiumReservoir.purityLevel)})
              </dt>
              <dd className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-[650] text-[#f4f7f7]">
                {formatKilogramFill(game.ship.fusionCore.tritiumReservoir)}
              </dd>
            </div>
            <div className="grid min-w-[58px] gap-px">
              <dt className={panelLabel}>
                H2O ({formatPurity(game.ship.fusionCore.coolantTank.purityLevel)})
              </dt>
              <dd className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-[650] text-[#f4f7f7]">
                {formatTonFill(game.ship.fusionCore.coolantTank)}
              </dd>
            </div>
          </dl>
        </section>
        <section
          className="flex min-w-0 items-center gap-3 rounded-md border border-[#273334] bg-[#0c1112] px-2.5 py-[7px] text-left max-[800px]:flex-col max-[800px]:items-start max-[800px]:gap-1.5"
          aria-label="Battery bank status"
        >
          <img
            className="h-[26px] w-[26px] shrink-0 [filter:invert(92%)_sepia(11%)_saturate(165%)_hue-rotate(125deg)_brightness(104%)_contrast(95%)]"
            src="/batery-bank-icon.svg"
            alt=""
            aria-hidden="true"
          />
          <dl className="m-0 flex min-w-0 items-center gap-2.5 max-[800px]:grid max-[800px]:w-full max-[800px]:grid-cols-3">
            <div className="grid min-w-[58px] gap-px">
              <dt className={panelLabel}>Charge</dt>
              <dd className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-[650] text-[#f4f7f7]">
                {formatPercentage(game.ship.batteryBank.chargeLevel)}
              </dd>
            </div>
            <div className="grid min-w-[58px] gap-px">
              <dt className={panelLabel}>Health</dt>
              <dd className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-[650] text-[#f4f7f7]">
                {formatPercentage(game.ship.batteryBank.healthLevel)}
              </dd>
            </div>
            <div className="grid min-w-[58px] gap-px">
              <dt className={panelLabel}>Max</dt>
              <dd className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-[650] text-[#f4f7f7]">
                {formatEnergy(game.ship.batteryBank.maxCapacityKilowattHours)}
              </dd>
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
