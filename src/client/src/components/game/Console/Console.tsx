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
        <span className={panelLabel}>Log</span>
        <h2 className={panelHeading}>Console</h2>
      </div>
      <div className="min-h-0 overflow-hidden rounded-md border border-[#243033] bg-[#020405] p-3.5 font-mono text-[13px] leading-normal text-[#84cdb8]">
        <p className="m-0 mb-1">&gt; Game engine link pending commands.</p>
        <p className="m-0 mb-1">&gt; Worker tick received: {tick || '--'}.</p>
        <p className="m-0 mb-1">&gt; Awaiting sector events.</p>
      </div>
    </section>
  )
}
