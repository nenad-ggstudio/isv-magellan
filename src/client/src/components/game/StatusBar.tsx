import type { ActiveGameState } from '../../gameTypes'

type StatusBarProps = {
  connectionState: string
  elapsedMilliseconds: number
  game: ActiveGameState
  tick: number
}

export function StatusBar({
  connectionState,
  elapsedMilliseconds,
  game,
  tick,
}: StatusBarProps) {
  return (
    <header className="status-bar">
      <div className="status-title">
        <strong>{game.name}</strong>
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
