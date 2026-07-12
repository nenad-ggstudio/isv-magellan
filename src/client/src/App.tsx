import { useEffect } from 'react'
import { GamePage } from './components/GamePage'
import { LandingPage } from './components/LandingPage'
import { useGameStore } from './stores/gameStore'

function App() {
  const connectionState = useGameStore((state) => state.connectionState)
  const gameState = useGameStore((state) => state.gameState)
  const tick = useGameStore((state) => state.tick)
  const saveStatus = useGameStore((state) => state.saveStatus)
  const connect = useGameStore((state) => state.connect)
  const disconnect = useGameStore((state) => state.disconnect)
  const startNewGame = useGameStore((state) => state.startNewGame)
  const saveGame = useGameStore((state) => state.saveGame)
  const loadGame = useGameStore((state) => state.loadGame)
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

  const loadActiveGame = async () => {
    if (window.confirm('Load the last save and discard unsaved progress?')) {
      await loadGame()
    }
  }

  const startActiveGame = async () => {
    if (window.confirm('Start a new game and discard unsaved progress?')) {
      await startNewGame()
    }
  }

  if (gameState?.screen === 'game' && gameState.game) {
    return (
      <GamePage
        actions={gameState.actions}
        connectionState={connectionState}
        game={gameState.game}
        onLoadGame={loadActiveGame}
        onSaveGame={saveGame}
        onStartNewGame={startActiveGame}
        saveStatus={saveStatus}
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
      onLoadGame={loadGame}
      onStartNewGame={startNewGame}
    />
  )
}

export default App
