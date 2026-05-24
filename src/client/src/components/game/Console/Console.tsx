type ConsoleProps = {
  tick: number
}

export function Console({ tick }: ConsoleProps) {
  return (
    <section className="console" aria-label="Game console">
      <div>
        <span className="panel-label">Log</span>
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
