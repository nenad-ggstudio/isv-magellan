import { useEffect, useState } from 'react'
import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from '@microsoft/signalr'
import { ConsolePanel } from './game/ConsolePanel'
import { LeftHud } from './game/LeftHud'
import { MainArea } from './game/MainArea'
import { RightHud } from './game/RightHud'
import { StatusBar } from './game/StatusBar'

type GameTick = {
  elapsedMilliseconds: number
  tick: number
}

export function GamePage() {
  const [connectionState, setConnectionState] = useState('Starting')
  const [tick, setTick] = useState<GameTick>({
    elapsedMilliseconds: 0,
    tick: 0,
  })

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl('/hubs/game')
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    connection.on('GameTick', (nextTick: GameTick) => setTick(nextTick))
    connection.onreconnecting(() => setConnectionState('Reconnecting'))
    connection.onreconnected(() => {
      setConnectionState('Connected')
      void startGame(connection)
    })
    connection.onclose(() => setConnectionState('Disconnected'))

    void startConnection(connection, setConnectionState)

    return () => {
      void connection.stop()
    }
  }, [])

  return (
    <main className="game-page">
      <StatusBar
        connectionState={connectionState}
        elapsedMilliseconds={tick.elapsedMilliseconds}
        tick={tick.tick}
      />
      <LeftHud />
      <MainArea />
      <RightHud />
      <ConsolePanel tick={tick.tick} />
    </main>
  )
}

async function startConnection(
  connection: HubConnection,
  setConnectionState: (state: string) => void,
) {
  try {
    await connection.start()
    setConnectionState('Connected')
    await startGame(connection)
  } catch {
    setConnectionState('Unavailable')
  }
}

async function startGame(connection: HubConnection) {
  if (connection.state === HubConnectionState.Connected) {
    await connection.invoke('StartNewGame')
  }
}
