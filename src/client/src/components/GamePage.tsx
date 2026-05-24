import { ConsolePanel } from './game/ConsolePanel'
import { LeftHud } from './game/LeftHud'
import { MainArea } from './game/MainArea'
import { RightHud } from './game/RightHud'
import { StatusBar } from './game/StatusBar'
import type { ActiveGameState, GameTick } from '../gameTypes'

type GamePageProps = {
  connectionState: string
  game: ActiveGameState
  tick: GameTick
}

export function GamePage({ connectionState, game, tick }: GamePageProps) {
  return (
    <main className="game-page">
      <StatusBar
        connectionState={connectionState}
        elapsedMilliseconds={tick.elapsedMilliseconds}
        game={game}
        tick={tick.tick}
      />
      <LeftHud />
      <MainArea />
      <RightHud />
      <ConsolePanel tick={tick.tick} />
    </main>
  )
}
