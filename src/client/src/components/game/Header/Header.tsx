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
      <ul className="resource-list" aria-label="Resources">
        <li>
          <span>Water</span>
          <strong>{game.resources.water}</strong>
        </li>
        <li>
          <span>Iron</span>
          <strong>{game.resources.iron}</strong>
        </li>
        <li>
          <span>Power</span>
          <strong>{game.resources.power}%</strong>
        </li>
      </ul>
    </header>
  )
}

function formatElapsed(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')

  return `${minutes}:${seconds}`
}
