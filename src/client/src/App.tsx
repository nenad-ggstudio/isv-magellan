import { useState } from 'react'
import './App.css'
import { GamePage } from './components/GamePage'
import { LandingPage } from './components/LandingPage'

function App() {
  const [gameStarted, setGameStarted] = useState(false)

  if (gameStarted) {
    return <GamePage />
  }

  return <LandingPage onNewGame={() => setGameStarted(true)} />
}

export default App
