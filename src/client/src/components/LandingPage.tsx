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
    <main className="landing-page">
      <button
        className="new-game-button"
        type="button"
        disabled={!startNewGameAction}
        onClick={onStartNewGame}
      >
        {startNewGameAction?.label ?? connectionState}
      </button>
    </main>
  )
}
