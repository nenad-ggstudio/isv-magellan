import { useState } from 'react'
import type { GameWorld, GravityScanner } from '../../../gameTypes'
import { navigationModes } from './constants'
import { JumpAreaMapPanel } from './JumpAreaMapPanel'
import { LocalMapPanel } from './LocalMapPanel'
import { LongRangeMapPanel } from './LongRangeMapPanel'
import { getSectorBaseSpan } from './mapMath'
import type { NavigationMode } from './types'
import { panelHeading, panelLabel } from '../styleClasses'

type NavigationProps = {
  elapsedMilliseconds: number
  gravityScanner: GravityScanner
  onStartGravityScan: () => Promise<void>
  tick: number
  world: GameWorld
}

export function Navigation({
  elapsedMilliseconds,
  gravityScanner,
  onStartGravityScan,
  tick,
  world,
}: NavigationProps) {
  const [mode, setMode] = useState<NavigationMode>('long-range-map')
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null)
  const [selectedLocalContactId, setSelectedLocalContactId] = useState<
    string | null
  >(null)
  const activeLabel =
    mode === 'long-range-map'
      ? world.longRangeMap.label
      : mode === 'jump-area'
        ? world.jumpAreaMap.label
        : world.localMap.label

  return (
    <section
      className="relative min-h-0 min-w-0 overflow-hidden [grid-area:navigation] before:pointer-events-none before:absolute before:inset-0 before:bg-[length:48px_48px] before:[background-image:linear-gradient(rgb(84_113_110_/_9%)_1px,transparent_1px),linear-gradient(90deg,rgb(84_113_110_/_9%)_1px,transparent_1px)] before:[content:''] before:[mask-image:radial-gradient(circle,black_15%,transparent_78%)]"
      aria-label="Navigation"
    >
      <div className="absolute inset-0 grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-[18px] px-6 py-[22px] max-[800px]:gap-3.5 max-[800px]:p-4">
        <header className="flex min-w-0 items-center justify-between gap-4 text-left max-[800px]:flex-col max-[800px]:items-stretch">
          <div>
            <span className={panelLabel}>Navigation</span>
            <h2 className={panelHeading}>{activeLabel}</h2>
          </div>
          <div
            className="inline-flex shrink-0 overflow-hidden rounded-md border border-[#2a3638] bg-[#060909] max-[800px]:w-full"
            role="tablist"
            aria-label="Navigation view"
          >
            {navigationModes.map((navigationMode) => (
              <button
                aria-selected={navigationMode.id === mode}
                className="min-h-[34px] min-w-[104px] cursor-pointer border-0 border-r border-[#2a3638] bg-transparent px-3 text-xs font-[650] uppercase tracking-normal text-[#8ea6a7] last:border-r-0 aria-selected:bg-[#d7ece5] aria-selected:text-[#071011] focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#f4f7f7] max-[800px]:min-w-0 max-[800px]:flex-1"
                key={navigationMode.id}
                onClick={() => setMode(navigationMode.id)}
                role="tab"
                type="button"
              >
                {navigationMode.label}
              </button>
            ))}
          </div>
        </header>

        {mode === 'long-range-map' ? (
          <LongRangeMapPanel
            elapsedMilliseconds={elapsedMilliseconds}
            map={world.longRangeMap}
            onSelectSystem={setSelectedSystemId}
            selectedSystemId={selectedSystemId}
            shipPosition={world.shipPosition}
          />
        ) : mode === 'jump-area' ? (
          <JumpAreaMapPanel
            elapsedMilliseconds={elapsedMilliseconds}
            gizmoReferenceSpan={getSectorBaseSpan(world.longRangeMap)}
            gravityScanner={gravityScanner}
            map={world.jumpAreaMap}
            onSelectSystem={setSelectedSystemId}
            onStartGravityScan={onStartGravityScan}
            selectedSystemId={selectedSystemId}
            tick={tick}
          />
        ) : (
          <LocalMapPanel
            elapsedMilliseconds={elapsedMilliseconds}
            map={world.localMap}
            onSelectContact={setSelectedLocalContactId}
            selectedContactId={selectedLocalContactId}
          />
        )}
      </div>
    </section>
  )
}
