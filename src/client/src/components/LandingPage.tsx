import type { GameStateAction } from '../gameTypes'

type LandingPageProps = {
  actions: GameStateAction[]
  connectionState: string
  onLoadGame: () => void
  onStartNewGame: () => void
}

export function LandingPage({
  actions,
  connectionState,
  onLoadGame,
  onStartNewGame,
}: LandingPageProps) {
  const startNewGameAction = actions.find(
    (action) => action.id === 'startNewGame',
  )
  const loadGameAction = actions.find((action) => action.id === 'loadGame')

  return (
    <main className="grid min-h-svh place-items-center bg-[#020508] [background:radial-gradient(circle_at_50%_42%,rgb(0_40_70_/_20%),transparent_40rem),#020508]">
      <div className="grid gap-10 text-center">
        <div className="grid gap-2.5">
          <p className="m-0 text-[10px] uppercase tracking-[0.25em] text-[#3a5c6e]">
            Deep Space Command System
          </p>
          <h1 className="m-0 text-2xl font-medium tracking-[0.08em] text-[#00c4e8] [text-shadow:0_0_30px_rgba(0,196,232,0.4),0_0_60px_rgba(0,196,232,0.15)]">
            ◈ {startNewGameAction ? 'SYSTEM READY' : 'INITIALIZING'}
          </h1>
          <p className="m-0 text-[10px] uppercase tracking-[0.25em] text-[#3a5c6e]">
            {startNewGameAction ? connectionState : connectionState}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            className="sci-corners-on min-h-[52px] min-w-[200px] cursor-pointer rounded border border-[#142840] bg-[rgb(4_10_18_/_90%)] px-6 text-[11px] font-medium uppercase tracking-[0.18em] text-[#6a9aac] transition-[background,border-color,color,box-shadow] duration-200 hover:border-[#00c4e8] hover:bg-[rgb(0_30_50_/_60%)] hover:text-[#c8dfe8] hover:[box-shadow:0_0_18px_rgba(0,196,232,0.18)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00c4e8] disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            disabled={!startNewGameAction}
            onClick={onStartNewGame}
          >
            {startNewGameAction?.label ?? '—'}
          </button>
          {loadGameAction && (
            <button
              className="sci-corners-on min-h-[52px] min-w-[200px] cursor-pointer rounded border border-[#1b4050] bg-[rgb(0_30_50_/_50%)] px-6 text-[11px] font-medium uppercase tracking-[0.18em] text-[#00c4e8] transition-[background,border-color,color,box-shadow] duration-200 hover:border-[#00c4e8] hover:text-[#c8dfe8] hover:[box-shadow:0_0_18px_rgba(0,196,232,0.18)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00c4e8]"
              type="button"
              onClick={onLoadGame}
            >
              {loadGameAction.label}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
