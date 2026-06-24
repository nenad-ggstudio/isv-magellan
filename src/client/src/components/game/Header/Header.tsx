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
      className={`${panelSurface} accent-top-line relative flex items-center justify-between gap-5 border-b px-6 [grid-area:header] max-[800px]:flex-col max-[800px]:items-stretch max-[800px]:p-4`}
    >
      <div className="grid min-w-0 gap-[4px] text-left">
        <div className="flex items-center gap-2">
          <span className="text-[#00c4e8] text-sm leading-none opacity-70">◈</span>
          <h1 className="m-0 text-lg font-medium tracking-wide text-[#00c4e8] [text-shadow:0_0_22px_rgba(0,196,232,0.4)]">
            {game.name}
          </h1>
        </div>
        <span className="flex items-center gap-[6px] text-[10px] uppercase tracking-[0.14em] text-[#3a5c6e]">
          <span className="status-online text-[#00e87c]">{connectionState}</span>
          <span className="opacity-40">/</span>
          <span className="tabular-nums">tick {tick}</span>
          <span className="opacity-40">/</span>
          <span className="tabular-nums">{formatElapsed(elapsedMilliseconds)}</span>
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-2 max-[800px]:grid max-[800px]:w-full max-[800px]:grid-cols-1">
        <section
          className="sci-corners-on flex min-w-0 items-center gap-3 rounded border border-[#142840] bg-[rgb(3_8_14_/_85%)] px-2.5 py-[7px] text-left max-[800px]:flex-col max-[800px]:items-start max-[800px]:gap-1.5"
          aria-label="Fusion core reserves"
        >
          <img
            className="h-[24px] w-[24px] shrink-0 opacity-50 [filter:invert(68%)_sepia(40%)_saturate(400%)_hue-rotate(160deg)_brightness(120%)_contrast(90%)]"
            src="/fusion-core-icon.svg"
            alt=""
            aria-hidden="true"
          />
          <dl className="m-0 flex min-w-0 items-center gap-2.5 max-[800px]:grid max-[800px]:w-full max-[800px]:grid-cols-3">
            <div className="grid min-w-[58px] gap-px">
              <dt className={panelLabel}>
                D2 ({formatPurity(game.ship.fusionCore.deuteriumReservoir.purityLevel)})
              </dt>
              <dd className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-medium tabular-nums text-[#c8dfe8]">
                {formatKilogramFill(game.ship.fusionCore.deuteriumReservoir)}
              </dd>
            </div>
            <div className="grid min-w-[58px] gap-px">
              <dt className={panelLabel}>
                T2 ({formatPurity(game.ship.fusionCore.tritiumReservoir.purityLevel)})
              </dt>
              <dd className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-medium tabular-nums text-[#c8dfe8]">
                {formatKilogramFill(game.ship.fusionCore.tritiumReservoir)}
              </dd>
            </div>
            <div className="grid min-w-[58px] gap-px">
              <dt className={panelLabel}>
                H2O ({formatPurity(game.ship.fusionCore.coolantTank.purityLevel)})
              </dt>
              <dd className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-medium tabular-nums text-[#c8dfe8]">
                {formatTonFill(game.ship.fusionCore.coolantTank)}
              </dd>
            </div>
          </dl>
        </section>

        <section
          className="sci-corners-on flex min-w-0 items-center gap-3 rounded border border-[#142840] bg-[rgb(3_8_14_/_85%)] px-2.5 py-[7px] text-left max-[800px]:flex-col max-[800px]:items-start max-[800px]:gap-1.5"
          aria-label="Battery bank status"
        >
          <img
            className="h-[24px] w-[24px] shrink-0 opacity-50 [filter:invert(68%)_sepia(40%)_saturate(400%)_hue-rotate(160deg)_brightness(120%)_contrast(90%)]"
            src="/batery-bank-icon.svg"
            alt=""
            aria-hidden="true"
          />
          <dl className="m-0 flex min-w-0 items-center gap-2.5 max-[800px]:grid max-[800px]:w-full max-[800px]:grid-cols-3">
            <div className="grid min-w-[58px] gap-px">
              <dt className={panelLabel}>Charge</dt>
              <dd className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-medium tabular-nums text-[#c8dfe8]">
                {formatPercentage(game.ship.batteryBank.chargeLevel)}
              </dd>
            </div>
            <div className="grid min-w-[58px] gap-px">
              <dt className={panelLabel}>Health</dt>
              <dd className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-medium tabular-nums text-[#c8dfe8]">
                {formatPercentage(game.ship.batteryBank.healthLevel)}
              </dd>
            </div>
            <div className="grid min-w-[58px] gap-px">
              <dt className={panelLabel}>Max</dt>
              <dd className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-medium tabular-nums text-[#c8dfe8]">
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
