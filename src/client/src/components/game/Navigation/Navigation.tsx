import { useState } from 'react'
import type { GameWorld } from '../../../gameTypes'
import { navigationModes } from './constants'
import { JumpAreaMapPanel } from './JumpAreaMapPanel'
import { LocalMapPanel } from './LocalMapPanel'
import { LongRangeMapPanel } from './LongRangeMapPanel'
import { getSectorBaseSpan } from './mapMath'
import type { NavigationMode } from './types'

type NavigationProps = {
  elapsedMilliseconds: number
  world: GameWorld
}

export function Navigation({ elapsedMilliseconds, world }: NavigationProps) {
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
    <section className="navigation-panel" aria-label="Navigation">
      <div className="navigation-shell">
        <header className="navigation-header">
          <div>
            <span className="panel-label">Navigation</span>
            <h2>{activeLabel}</h2>
          </div>
          <div
            className="scan-tabs"
            role="tablist"
            aria-label="Navigation view"
          >
            {navigationModes.map((navigationMode) => (
              <button
                aria-selected={navigationMode.id === mode}
                className="scan-tab"
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
            map={world.jumpAreaMap}
            onSelectSystem={setSelectedSystemId}
            selectedSystemId={selectedSystemId}
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
