import { Console } from './game/Console/Console'
import { CrewHub } from './game/CrewHub/CrewHub'
import { Header } from './game/Header/Header'
import { Navigation } from './game/Navigation/Navigation'
import { ShipStatus } from './game/ShipStatus/ShipStatus'
import type {
  ActiveGameState,
  GameStateAction,
  GameTick,
  JumpQuote,
} from '../gameTypes'

type GamePageProps = {
  connectionState: string
  actions: GameStateAction[]
  game: ActiveGameState
  onCaptureEmScanReport: (
    focus: number,
    filter: number,
    phaseErrorRadians: number,
  ) => Promise<void>
  onLoadGame: () => Promise<void>
  onSaveGame: () => Promise<void>
  onStartNewGame: () => Promise<void>
  onStartEmScan: (x: number, y: number) => Promise<void>
  onStartGravityScan: () => Promise<void>
  onStopEmScan: () => Promise<void>
  onGetJumpQuote: (x: number, y: number) => Promise<JumpQuote | null>
  onJump: (
    expectedOriginX: number,
    expectedOriginY: number,
    targetX: number,
    targetY: number,
  ) => Promise<boolean>
  tick: GameTick
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
}

export function GamePage({
  actions,
  connectionState,
  game,
  onCaptureEmScanReport,
  onLoadGame,
  onSaveGame,
  onStartNewGame,
  onStartEmScan,
  onStartGravityScan,
  onStopEmScan,
  onGetJumpQuote,
  onJump,
  tick,
  saveStatus,
}: GamePageProps) {
  return (
    <main className="grid min-h-svh text-[#6a9aac] [background:radial-gradient(circle_at_50%_0%,rgb(0_50_90_/_16%),transparent_42rem),#020508] [grid-template:'header_header_header'_72px_'crew_navigation_ship'_minmax(0,1fr)_'crew_console_ship'_minmax(170px,25svh)_/_minmax(180px,238px)_minmax(0,1fr)_minmax(180px,238px)] max-[800px]:[grid-template:'header'_auto_'navigation'_minmax(620px,1fr)_'crew'_auto_'ship'_auto_'console'_minmax(180px,28svh)]">
      <Header
        actions={actions}
        connectionState={connectionState}
        elapsedMilliseconds={tick.elapsedMilliseconds}
        game={game}
        onLoadGame={onLoadGame}
        onSaveGame={onSaveGame}
        onStartNewGame={onStartNewGame}
        saveStatus={saveStatus}
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
        onGetJumpQuote={onGetJumpQuote}
        onJump={onJump}
        tick={tick.tick}
        world={game.world}
      />
      <ShipStatus ship={game.ship} />
      <Console tick={tick.tick} />
    </main>
  )
}
