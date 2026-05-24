const shipReadouts = [
  ['Hull', 'Nominal'],
  ['Reactor', '82%'],
  ['Engines', 'Standby'],
]

export function ShipStatus() {
  return (
    <aside className="side-panel ship-status">
      <div>
        <span className="panel-label">Systems</span>
        <h2>Ship Status</h2>
      </div>
      <dl className="panel-readout">
        {shipReadouts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  )
}
