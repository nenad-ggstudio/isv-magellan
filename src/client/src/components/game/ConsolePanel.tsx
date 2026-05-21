type ConsolePanelProps = {
  tick: number
}

export function ConsolePanel({ tick }: ConsolePanelProps) {
  return (
    <section className="console-panel" aria-label="Game console">
      <div>
        <span className="hud-label">Log</span>
        <h2>Console</h2>
      </div>
      <div className="console-stream">
        <p>&gt; Game engine link pending commands.</p>
        <p>&gt; Worker tick received: {tick || '--'}.</p>
        <p>&gt; Awaiting sector events.</p>
      </div>
    </section>
  )
}
