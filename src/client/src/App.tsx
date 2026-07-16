import { useEffect, useState } from 'react'
import { GamePage } from './components/GamePage'
import { JumpTransition } from './components/JumpTransition'
import { LandingPage } from './components/LandingPage'
import { useGameStore } from './stores/gameStore'

function App() {
  const [jumpTransitionActive, setJumpTransitionActive] = useState(false)
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
  const getJumpQuote = useGameStore((state) => state.getJumpQuote)
  const jump = useGameStore((state) => state.jump)

  useEffect(() => {
    void connect()

    return () => {
      void disconnect()
    }
  }, [connect, disconnect])

  useEffect(() => {
    if (!jumpTransitionActive) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setJumpTransitionActive(false)
    }, 3_000)

    return () => window.clearTimeout(timeoutId)
  }, [jumpTransitionActive])

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

  const executeJump = async (
    expectedOriginX: number,
    expectedOriginY: number,
    targetX: number,
    targetY: number,
  ) => {
    const succeeded = await jump(
      expectedOriginX,
      expectedOriginY,
      targetX,
      targetY,
    )

    if (succeeded) {
      setJumpTransitionActive(true)
    }

    return succeeded
  }

  if (gameState?.screen === 'game' && gameState.game) {
    return (
      <>
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
          onGetJumpQuote={getJumpQuote}
          onJump={executeJump}
          tick={tick}
        />
        {jumpTransitionActive ? <JumpTransition /> : null}
      </>
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
