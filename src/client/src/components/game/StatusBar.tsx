type StatusBarProps = {
  connectionState: string
  elapsedMilliseconds: number
  tick: number
}

export function StatusBar({
  connectionState,
  elapsedMilliseconds,
  tick,
}: StatusBarProps) {
  return (
    <header className="status-bar">
      <div className="status-title">
        <strong>Magellan Sector</strong>
        <span className="connection-state">
          {connectionState} / tick {tick} / {formatElapsed(elapsedMilliseconds)}
        </span>
      </div>
      <ul className="resource-list" aria-label="Resources">
        <li>
          <span>Water</span>
          <strong>148</strong>
        </li>
        <li>
          <span>Iron</span>
          <strong>62</strong>
        </li>
        <li>
          <span>Power</span>
          <strong>91%</strong>
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
