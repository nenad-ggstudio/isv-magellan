import type { GameStateAction } from '../gameTypes'

type LandingPageProps = {
  actions: GameStateAction[]
  connectionState: string
  onStartNewGame: () => void
}

export function LandingPage({
  actions,
  connectionState,
  onStartNewGame,
}: LandingPageProps) {
  const startNewGameAction = actions.find(
    (action) => action.id === 'startNewGame',
  )

  return (
    <main className="grid min-h-svh place-items-center bg-[#020202]">
      <button
        className="min-h-[52px] min-w-[168px] cursor-pointer rounded-md border border-[#3f474e] bg-[#0d1012] px-5 font-[650] uppercase tracking-normal text-[#f4f7f7] transition-[background,border-color,transform] duration-150 hover:-translate-y-px hover:border-[#8da29f] hover:bg-[#161b1c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d4eee5] disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        disabled={!startNewGameAction}
        onClick={onStartNewGame}
      >
        {startNewGameAction?.label ?? connectionState}
      </button>
    </main>
  )
}
