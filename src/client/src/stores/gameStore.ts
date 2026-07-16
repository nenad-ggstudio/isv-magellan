import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from '@microsoft/signalr'
import { create } from 'zustand'
import gameHubContract from '../gameHubContract.json'
import type {
  ActiveGameState,
  BatteryBank,
  EmScanner,
  GameState,
  GameTick,
  GravityScanner,
  JumpQuote,
} from '../gameTypes'

const { clientEvents, serverMethods } = gameHubContract

const initialTick: GameTick = {
  elapsedMilliseconds: 0,
  tick: 0,
}

type GameStore = {
  connectionState: string
  gameState: GameState | null
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  tick: GameTick
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  startNewGame: () => Promise<void>
  saveGame: () => Promise<void>
  loadGame: () => Promise<void>
  startGravityScan: () => Promise<void>
  startEmScan: (x: number, y: number) => Promise<void>
  captureEmScanReport: (
    focus: number,
    filter: number,
    phaseErrorRadians: number,
  ) => Promise<void>
  stopEmScan: () => Promise<void>
  getJumpQuote: (x: number, y: number) => Promise<JumpQuote | null>
  jump: (
    expectedOriginX: number,
    expectedOriginY: number,
    targetX: number,
    targetY: number,
  ) => Promise<boolean>
}

let connection: HubConnection | null = null
let isConnecting = false

export const useGameStore = create<GameStore>((set) => ({
  connectionState: 'Starting',
  gameState: null,
  saveStatus: 'idle',
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

    nextConnection.on(clientEvents.gameStateChanged, (nextState: GameState) => {
      if (connection !== nextConnection) {
        return
      }

      if (nextState.screen === 'game') {
        set({ gameState: nextState })
      } else {
        set({ gameState: nextState, tick: initialTick })
      }
    })
    nextConnection.on(clientEvents.gameTick, (nextTick: GameTick) => {
      if (connection !== nextConnection) {
        return
      }

      set({ tick: nextTick })
    })
    nextConnection.on(clientEvents.batteryBankChanged, (nextBatteryBank: BatteryBank) => {
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
      clientEvents.gravityScannerChanged,
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
    nextConnection.on(clientEvents.emScannerChanged, (nextEmScanner: EmScanner) => {
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
      set({ saveStatus: 'idle', tick: initialTick })
      await connection.invoke(serverMethods.startNewGame)
    }
  },

  saveGame: async () => {
    if (connection?.state !== HubConnectionState.Connected) {
      return
    }

    set({ saveStatus: 'saving' })

    try {
      await connection.invoke(serverMethods.saveGame)
      set({ saveStatus: 'saved' })
    } catch {
      set({ saveStatus: 'error' })
    }
  },

  loadGame: async () => {
    if (connection?.state === HubConnectionState.Connected) {
      set({ saveStatus: 'idle', tick: initialTick })
      await connection.invoke(serverMethods.loadGame)
    }
  },

  startGravityScan: async () => {
    if (connection?.state === HubConnectionState.Connected) {
      await connection.invoke(serverMethods.startGravityScan)
    }
  },

  startEmScan: async (x: number, y: number) => {
    if (connection?.state === HubConnectionState.Connected) {
      await connection.invoke(serverMethods.startEmScan, x, y)
    }
  },

  captureEmScanReport: async (
    focus: number,
    filter: number,
    phaseErrorRadians: number,
  ) => {
    if (connection?.state === HubConnectionState.Connected) {
      await connection.invoke(
        serverMethods.captureEmScanReport,
        focus,
        filter,
        phaseErrorRadians,
      )
    }
  },

  stopEmScan: async () => {
    if (connection?.state === HubConnectionState.Connected) {
      await connection.invoke(serverMethods.stopEmScan)
    }
  },

  getJumpQuote: async (x: number, y: number) => {
    if (connection?.state !== HubConnectionState.Connected) {
      return null
    }

    return connection.invoke<JumpQuote | null>(serverMethods.getJumpQuote, x, y)
  },

  jump: async (
    expectedOriginX: number,
    expectedOriginY: number,
    targetX: number,
    targetY: number,
  ) => {
    if (connection?.state !== HubConnectionState.Connected) {
      return false
    }

    return connection.invoke<boolean>(
      serverMethods.jump,
      expectedOriginX,
      expectedOriginY,
      targetX,
      targetY,
    )
  },
}))

async function getGameState(currentConnection: HubConnection) {
  if (
    connection === currentConnection &&
    currentConnection.state === HubConnectionState.Connected
  ) {
    await currentConnection.invoke(serverMethods.getGameState)
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
      saveStatus: 'idle',
    }
  })
}
