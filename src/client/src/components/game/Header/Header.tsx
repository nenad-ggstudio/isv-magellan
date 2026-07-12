import { useState } from 'react'
import type { ActiveGameState, GameStateAction } from '../../../gameTypes'
import { panelLabel, panelSurface } from '../styleClasses'

type HeaderProps = {
  actions: GameStateAction[]
  connectionState: string
  elapsedMilliseconds: number
  game: ActiveGameState
  onLoadGame: () => void
  onSaveGame: () => void
  onStartNewGame: () => void
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  tick: number
}

export function Header({
  actions,
  connectionState,
  elapsedMilliseconds,
  game,
  onLoadGame,
  onSaveGame,
  onStartNewGame,
  saveStatus,
  tick,
}: HeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const canStartNew = actions.some((action) => action.id === 'startNewGame')
  const canSave = actions.some((action) => action.id === 'saveGame')
  const canLoad = actions.some((action) => action.id === 'loadGame')

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

        <button
          className="grid size-10 shrink-0 cursor-pointer place-items-center rounded border border-[#142840] bg-[rgb(3_8_14_/_85%)] text-[#6a9aac] transition-[border-color,color,box-shadow] hover:border-[#00c4e8] hover:text-[#c8dfe8] hover:[box-shadow:0_0_18px_rgba(0,196,232,0.18)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00c4e8] max-[800px]:absolute max-[800px]:right-4 max-[800px]:top-4"
          type="button"
          aria-label="Open game settings"
          aria-haspopup="dialog"
          aria-expanded={isSettingsOpen}
          onClick={() => setIsSettingsOpen(true)}
        >
          <svg
            className="size-[18px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z" />
            <path d="m19.2 13.05 1.35 1.05-1.8 3.12-1.58-.65a7.9 7.9 0 0 1-1.82 1.05l-.23 1.7h-3.6l-.23-1.7a7.9 7.9 0 0 1-1.82-1.05l-1.58.65-1.8-3.12 1.35-1.05a8.4 8.4 0 0 1 0-2.1L6.1 9.9l1.8-3.12 1.58.65a7.9 7.9 0 0 1 1.82-1.05l.23-1.7h3.6l.23 1.7a7.9 7.9 0 0 1 1.82 1.05l1.58-.65 1.8 3.12-1.35 1.05a8.4 8.4 0 0 1 0 2.1Z" />
          </svg>
        </button>
      </div>

      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgb(0_3_7_/_78%)] p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={() => setIsSettingsOpen(false)}
        >
          <section
            className="sci-corners-on w-full max-w-[360px] rounded border border-[#1b4050] bg-[#040a12] p-5 text-left shadow-[0_0_50px_rgba(0,196,232,0.12)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-settings-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-4 border-b border-[#142840] pb-3">
              <div>
                <p className="m-0 text-[9px] uppercase tracking-[0.2em] text-[#3a5c6e]">
                  Command System
                </p>
                <h2
                  className="m-0 mt-1 text-sm font-medium uppercase tracking-[0.14em] text-[#00c4e8]"
                  id="game-settings-title"
                >
                  Game Settings
                </h2>
              </div>
              <button
                className="grid size-8 cursor-pointer place-items-center rounded border border-[#142840] text-[#6a9aac] hover:border-[#00c4e8] hover:text-[#c8dfe8]"
                type="button"
                aria-label="Close game settings"
                onClick={() => setIsSettingsOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="grid gap-2">
              <SettingsAction
                disabled={!canStartNew}
                label="New Game"
                onClick={() => {
                  setIsSettingsOpen(false)
                  onStartNewGame()
                }}
              />
              <SettingsAction
                disabled={!canSave || saveStatus === 'saving'}
                label={
                  saveStatus === 'saving'
                    ? 'Saving…'
                    : saveStatus === 'saved'
                      ? 'Game Saved'
                      : saveStatus === 'error'
                        ? 'Retry Save'
                        : 'Save Game'
                }
                onClick={onSaveGame}
              />
              <SettingsAction
                disabled={!canLoad}
                label="Load Game"
                onClick={() => {
                  setIsSettingsOpen(false)
                  onLoadGame()
                }}
              />
            </div>
          </section>
        </div>
      )}
    </header>
  )
}

function SettingsAction({
  disabled,
  label,
  onClick,
}: {
  disabled: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      className="min-h-11 cursor-pointer rounded border border-[#142840] bg-[rgb(0_20_34_/_45%)] px-4 text-left text-[10px] uppercase tracking-[0.16em] text-[#6a9aac] transition-[background,border-color,color] hover:border-[#00c4e8] hover:bg-[rgb(0_30_50_/_65%)] hover:text-[#c8dfe8] disabled:cursor-not-allowed disabled:opacity-35"
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
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
