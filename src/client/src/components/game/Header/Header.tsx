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
          <strong>{formatContamination(game.resources.water.contaminationLevel)}</strong>
        </li>
        <li>
          <span>Lithium</span>
          <strong>{formatContamination(game.resources.lithium.contaminationLevel)}</strong>
        </li>
        <li>
          <span>Carbon</span>
          <strong>{formatContamination(game.resources.carbon.contaminationLevel)}</strong>
        </li>
      </ul>
    </header>
  )
}

function formatContamination(contaminationLevel: number) {
  return `${Math.round(contaminationLevel * 100)}%`
}

function formatElapsed(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')

  return `${minutes}:${seconds}`
}
