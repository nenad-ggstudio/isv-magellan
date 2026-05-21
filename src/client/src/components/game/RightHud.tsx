export function RightHud() {
  return (
    <aside className="side-hud right-hud">
      <div>
        <span className="hud-label">Systems</span>
        <h2>Sector HUD</h2>
      </div>
      <dl className="hud-readout">
        <div>
          <dt>Orbit</dt>
          <dd>Stable</dd>
        </div>
        <div>
          <dt>Signals</dt>
          <dd>3</dd>
        </div>
        <div>
          <dt>Threat</dt>
          <dd>Low</dd>
        </div>
      </dl>
    </aside>
  )
}
