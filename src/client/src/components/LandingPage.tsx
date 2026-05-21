type LandingPageProps = {
  onNewGame: () => void
}

export function LandingPage({ onNewGame }: LandingPageProps) {
  return (
    <main className="landing-page">
      <button className="new-game-button" type="button" onClick={onNewGame}>
        New Game
      </button>
    </main>
  )
}
