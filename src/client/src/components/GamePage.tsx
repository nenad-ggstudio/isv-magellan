import { Console } from './game/Console/Console'
import { CrewHub } from './game/CrewHub/CrewHub'
import { Header } from './game/Header/Header'
import { Navigation } from './game/Navigation/Navigation'
import { ShipStatus } from './game/ShipStatus/ShipStatus'
import type { ActiveGameState, GameTick } from '../gameTypes'

type GamePageProps = {
  connectionState: string
  game: ActiveGameState
  tick: GameTick
}

export function GamePage({ connectionState, game, tick }: GamePageProps) {
  return (
    <main className="game-page">
      <Header
        connectionState={connectionState}
        elapsedMilliseconds={tick.elapsedMilliseconds}
        game={game}
        tick={tick.tick}
      />
      <CrewHub />
      <Navigation />
      <ShipStatus />
      <Console tick={tick.tick} />
    </main>
  )
}
