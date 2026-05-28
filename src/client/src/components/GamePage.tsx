import { useState } from 'react'
import { Console } from './game/Console/Console'
import { CrewHub } from './game/CrewHub/CrewHub'
import { Header } from './game/Header/Header'
import { Navigation } from './game/Navigation/Navigation'
import { ShipStatus } from './game/ShipStatus/ShipStatus'
import type { ActiveGameState, GameTick } from '../gameTypes'

type GamePageProps = {
  connectionState: string
  game: ActiveGameState
  onStartGravityScan: () => Promise<void>
  tick: GameTick
}

export function GamePage({
  connectionState,
  game,
  onStartGravityScan,
  tick,
}: GamePageProps) {
  const [navigationDebugLine, setNavigationDebugLine] = useState(
    'No stellar-system pointer event yet.',
  )

  return (
    <main className="grid min-h-svh bg-[#050607] text-[#d8e0df] [background:radial-gradient(circle_at_50%_38%,rgb(36_49_48_/_22%),transparent_34rem),#050607] [grid-template:'header_header_header'_72px_'crew_navigation_ship'_minmax(0,1fr)_'crew_console_ship'_minmax(170px,25svh)_/_minmax(180px,238px)_minmax(0,1fr)_minmax(180px,238px)] max-[800px]:[grid-template:'header'_auto_'navigation'_minmax(620px,1fr)_'crew'_auto_'ship'_auto_'console'_minmax(180px,28svh)]">
      <Header
        connectionState={connectionState}
        elapsedMilliseconds={tick.elapsedMilliseconds}
        game={game}
        tick={tick.tick}
      />
      <CrewHub />
      <Navigation
        elapsedMilliseconds={tick.elapsedMilliseconds}
        gravityScanner={game.ship.scanners.gravityScanner}
        onDebug={setNavigationDebugLine}
        onStartGravityScan={onStartGravityScan}
        tick={tick.tick}
        world={game.world}
      />
      <ShipStatus ship={game.ship} />
      <Console debugLine={navigationDebugLine} tick={tick.tick} />
    </main>
  )
}
