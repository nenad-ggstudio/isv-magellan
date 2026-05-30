import { useEffect } from 'react'
import { GamePage } from './components/GamePage'
import { LandingPage } from './components/LandingPage'
import { useGameStore } from './stores/gameStore'

function App() {
  const connectionState = useGameStore((state) => state.connectionState)
  const gameState = useGameStore((state) => state.gameState)
  const tick = useGameStore((state) => state.tick)
  const connect = useGameStore((state) => state.connect)
  const disconnect = useGameStore((state) => state.disconnect)
  const startNewGame = useGameStore((state) => state.startNewGame)
  const startGravityScan = useGameStore((state) => state.startGravityScan)
  const startEmScan = useGameStore((state) => state.startEmScan)
  const captureEmScanReport = useGameStore(
    (state) => state.captureEmScanReport,
  )
  const stopEmScan = useGameStore((state) => state.stopEmScan)

  useEffect(() => {
    void connect()

    return () => {
      void disconnect()
    }
  }, [connect, disconnect])

  if (gameState?.screen === 'game' && gameState.game) {
    return (
      <GamePage
        connectionState={connectionState}
        game={gameState.game}
        onCaptureEmScanReport={captureEmScanReport}
        onStartEmScan={startEmScan}
        onStartGravityScan={startGravityScan}
        onStopEmScan={stopEmScan}
        tick={tick}
      />
    )
  }

  return (
    <LandingPage
      actions={gameState?.actions ?? []}
      connectionState={connectionState}
      onStartNewGame={startNewGame}
    />
  )
}

export default App
