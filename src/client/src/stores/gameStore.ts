import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from '@microsoft/signalr'
import { create } from 'zustand'
import type {
  ActiveGameState,
  BatteryBank,
  EmScanner,
  GameState,
  GameTick,
  GravityScanner,
} from '../gameTypes'

const initialTick: GameTick = {
  elapsedMilliseconds: 0,
  tick: 0,
}

type GameStore = {
  connectionState: string
  gameState: GameState | null
  tick: GameTick
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  startNewGame: () => Promise<void>
  startGravityScan: () => Promise<void>
  startEmScan: (x: number, y: number) => Promise<void>
  captureEmScanReport: (
    focus: number,
    filter: number,
    phaseErrorRadians: number,
  ) => Promise<void>
  stopEmScan: () => Promise<void>
}

let connection: HubConnection | null = null
let isConnecting = false

export const useGameStore = create<GameStore>((set) => ({
  connectionState: 'Starting',
  gameState: null,
  tick: initialTick,

  connect: async () => {
    if (
      isConnecting ||
      connection?.state === HubConnectionState.Connected ||
      connection?.state === HubConnectionState.Connecting ||
      connection?.state === HubConnectionState.Reconnecting
    ) {
      return
    }

    isConnecting = true
    set({ connectionState: 'Starting' })

    const nextConnection = new HubConnectionBuilder()
      .withUrl('/hubs/game')
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    connection = nextConnection

    nextConnection.on('GameStateChanged', (nextState: GameState) => {
      if (connection !== nextConnection) {
        return
      }

      if (nextState.screen === 'game') {
        set({ gameState: nextState })
      } else {
        set({ gameState: nextState, tick: initialTick })
      }
    })
    nextConnection.on('GameTick', (nextTick: GameTick) => {
      if (connection !== nextConnection) {
        return
      }

      set({ tick: nextTick })
    })
    nextConnection.on('BatteryBankChanged', (nextBatteryBank: BatteryBank) => {
      if (connection !== nextConnection) {
        return
      }

      updateActiveGame(set, (game) => ({
        ...game,
        ship: {
          ...game.ship,
          batteryBank: nextBatteryBank,
        },
      }))
    })
    nextConnection.on(
      'GravityScannerChanged',
      (nextGravityScanner: GravityScanner) => {
        if (connection !== nextConnection) {
          return
        }

        updateActiveGame(set, (game) => ({
          ...game,
          ship: {
            ...game.ship,
            scanners: {
              ...game.ship.scanners,
              gravityScanner: nextGravityScanner,
            },
          },
        }))
      },
    )
    nextConnection.on('EmScannerChanged', (nextEmScanner: EmScanner) => {
      if (connection !== nextConnection) {
        return
      }

      updateActiveGame(set, (game) => ({
        ...game,
        ship: {
          ...game.ship,
          scanners: {
            ...game.ship.scanners,
            emScanner: nextEmScanner,
          },
        },
      }))
    })
    nextConnection.onreconnecting(() => {
      if (connection !== nextConnection) {
        return
      }

      set({ connectionState: 'Reconnecting' })
    })
    nextConnection.onreconnected(() => {
      if (connection !== nextConnection) {
        return
      }

      set({ connectionState: 'Connected' })
      void getGameState(nextConnection)
    })
    nextConnection.onclose(() => {
      if (connection !== nextConnection) {
        return
      }

      set({ connectionState: 'Disconnected' })
    })

    try {
      await nextConnection.start()

      if (connection === nextConnection) {
        set({ connectionState: 'Connected' })
      } else {
        await nextConnection.stop()
      }
    } catch {
      if (connection === nextConnection) {
        connection = null
        set({ connectionState: 'Unavailable' })
      }
    } finally {
      isConnecting = false
    }
  },

  disconnect: async () => {
    const currentConnection = connection
    connection = null
    isConnecting = false

    if (currentConnection) {
      await currentConnection.stop()
    }
  },

  startNewGame: async () => {
    if (connection?.state === HubConnectionState.Connected) {
      set({ tick: initialTick })
      await connection.invoke('StartNewGame')
    }
  },

  startGravityScan: async () => {
    if (connection?.state === HubConnectionState.Connected) {
      await connection.invoke('StartGravityScan')
    }
  },

  startEmScan: async (x: number, y: number) => {
    if (connection?.state === HubConnectionState.Connected) {
      await connection.invoke('StartEmScan', x, y)
    }
  },

  captureEmScanReport: async (
    focus: number,
    filter: number,
    phaseErrorRadians: number,
  ) => {
    if (connection?.state === HubConnectionState.Connected) {
      await connection.invoke(
        'CaptureEmScanReport',
        focus,
        filter,
        phaseErrorRadians,
      )
    }
  },

  stopEmScan: async () => {
    if (connection?.state === HubConnectionState.Connected) {
      await connection.invoke('StopEmScan')
    }
  },
}))

async function getGameState(currentConnection: HubConnection) {
  if (
    connection === currentConnection &&
    currentConnection.state === HubConnectionState.Connected
  ) {
    await currentConnection.invoke('GetGameState')
  }
}

function updateActiveGame(
  set: (
    partial:
      | Partial<GameStore>
      | ((state: GameStore) => Partial<GameStore>),
  ) => void,
  update: (game: ActiveGameState) => ActiveGameState,
) {
  set((state) => {
    if (state.gameState?.screen !== 'game' || !state.gameState.game) {
      return {}
    }

    return {
      gameState: {
        ...state.gameState,
        game: update(state.gameState.game),
      },
    }
  })
}
