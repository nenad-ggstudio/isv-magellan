import { cx } from '../../../classNames'
import { panelHeading, panelLabel, panelSurface } from '../styleClasses'

type ConsoleProps = {
  tick: number
}

export function Console({ tick }: ConsoleProps) {
  return (
    <section
      className={cx(
        panelSurface,
        'grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 border-t px-6 pb-5 pt-4 text-left [grid-area:console] max-[800px]:px-4',
      )}
      aria-label="Game console"
    >
      <div>
        <span className={panelLabel}>SYS.LOG</span>
        <h2 className={panelHeading}>Console</h2>
      </div>
      <div className="sci-corners-on relative min-h-0 overflow-hidden rounded border border-[#142840] bg-[#010306] p-3.5 text-[13px] leading-normal text-[#00e87c]">
        <div className="sci-scanlines pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative">
          <p className="m-0 mb-1 opacity-50">&gt; Game engine link pending commands.</p>
          <p className="m-0 mb-1 opacity-70">&gt; Worker tick received: {tick || '--'}.</p>
          <p className="m-0 mb-2 opacity-80">&gt; Awaiting sector events.</p>
          <p className="terminal-cursor m-0">&gt;</p>
        </div>
      </div>
    </section>
  )
}
