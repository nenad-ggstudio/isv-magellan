const crewReadouts = [
  ['Crew', '12'],
  ['Morale', 'Steady'],
  ['Assignment', 'Survey'],
]

export function CrewHub() {
  return (
    <aside className="side-panel crew-hub">
      <div>
        <span className="panel-label">Crew</span>
        <h2>Crew Hub</h2>
      </div>
      <dl className="panel-readout">
        {crewReadouts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  )
}
