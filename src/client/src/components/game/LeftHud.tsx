export function LeftHud() {
  return (
    <aside className="side-hud left-hud">
      <div>
        <span className="hud-label">Command</span>
        <h2>Colony HUD</h2>
      </div>
      <dl className="hud-readout">
        <div>
          <dt>Crew</dt>
          <dd>12</dd>
        </div>
        <div>
          <dt>Survey</dt>
          <dd>Idle</dd>
        </div>
        <div>
          <dt>Storage</dt>
          <dd>38%</dd>
        </div>
      </dl>
    </aside>
  )
}
