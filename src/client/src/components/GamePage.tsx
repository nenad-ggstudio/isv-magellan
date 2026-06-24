import { Console } from './game/Console/Console'
import { CrewHub } from './game/CrewHub/CrewHub'
import { Header } from './game/Header/Header'
import { Navigation } from './game/Navigation/Navigation'
import { ShipStatus } from './game/ShipStatus/ShipStatus'
import type { ActiveGameState, GameTick } from '../gameTypes'

type GamePageProps = {
  connectionState: string
  game: ActiveGameState
  onCaptureEmScanReport: (
    focus: number,
    filter: number,
    phaseErrorRadians: number,
  ) => Promise<void>
  onStartEmScan: (x: number, y: number) => Promise<void>
  onStartGravityScan: () => Promise<void>
  onStopEmScan: () => Promise<void>
  tick: GameTick
}

export function GamePage({
  connectionState,
  game,
  onCaptureEmScanReport,
  onStartEmScan,
  onStartGravityScan,
  onStopEmScan,
  tick,
}: GamePageProps) {
  return (
    <main className="grid min-h-svh text-[#6a9aac] [background:radial-gradient(circle_at_50%_0%,rgb(0_50_90_/_16%),transparent_42rem),#020508] [grid-template:'header_header_header'_72px_'crew_navigation_ship'_minmax(0,1fr)_'crew_console_ship'_minmax(170px,25svh)_/_minmax(180px,238px)_minmax(0,1fr)_minmax(180px,238px)] max-[800px]:[grid-template:'header'_auto_'navigation'_minmax(620px,1fr)_'crew'_auto_'ship'_auto_'console'_minmax(180px,28svh)]">
      <Header
        connectionState={connectionState}
        elapsedMilliseconds={tick.elapsedMilliseconds}
        game={game}
        tick={tick.tick}
      />
      <CrewHub />
      <Navigation
        elapsedMilliseconds={tick.elapsedMilliseconds}
        emScanner={game.ship.scanners.emScanner}
        gravityScanner={game.ship.scanners.gravityScanner}
        onCaptureEmScanReport={onCaptureEmScanReport}
        onStartEmScan={onStartEmScan}
        onStartGravityScan={onStartGravityScan}
        onStopEmScan={onStopEmScan}
        tick={tick.tick}
        world={game.world}
      />
      <ShipStatus ship={game.ship} />
      <Console tick={tick.tick} />
    </main>
  )
}
