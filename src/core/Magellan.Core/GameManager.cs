using System.Collections.Concurrent;
using Events;
using Infrastructure;
using Ship.Scanners;

public sealed class GameManager(
    IGameEventBus gameEventBus,
    GameEngine gameEngine,
    ILogger<GameManager> logger)
{
    private readonly ConcurrentDictionary<Guid, GameState> states = new();
    private readonly ConcurrentDictionary<string, Guid> connectionGames = new();
    private readonly ConcurrentDictionary<Guid, ConcurrentDictionary<string, byte>> gameConnections = new();
    private readonly Lock currentGameGate = new();
    private Guid? currentGameId;

    public async Task ConnectAsync(
        string connectionId,
        CancellationToken cancellationToken = default)
    {
        var activeGameId = GetCurrentGameId();

        if (activeGameId is Guid gameId && states.TryGetValue(gameId, out var state))
        {
            AttachConnection(connectionId, gameId);
            await PublishClientStateChanged(connectionId, state, cancellationToken);
            return;
        }

        await PublishClientStateChanged(
            connectionId,
            GameState.Bootstrap(),
            cancellationToken);
    }

    public async Task StartNewGameAsync(
        string connectionId,
        CancellationToken cancellationToken = default)
    {
        var gameId = Guid.NewGuid();
        var startedAt = DateTimeOffset.UtcNow;
        var state = GameState.NewGame(gameId, startedAt);

        ReplaceCurrentGame(gameId, state, connectionId);
        gameEngine.StartNewGame(gameId, startedAt);

        await PublishStateChanged(gameId, state, cancellationToken);
    }

    public async Task StartGravityScanAsync(
        string connectionId,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetGameForConnection(connectionId, out var gameId, out var state)
            || state?.Game is null)
        {
            return;
        }

        var tick = gameEngine.GetCurrentTick(gameId);
        var activeGame = state.Game;
        var scanner = activeGame.Ship.Scanners.GravityScanner;

        if (scanner.IsScanInProgress(tick))
        {
            return;
        }

        var nextScanner = scanner.StartScan(tick, activeGame.World.JumpAreaMap);
        var nextShip = activeGame.Ship.WithScanners(
            activeGame.Ship.Scanners with
            {
                GravityScanner = nextScanner
            });
        var nextState = state with
        {
            Game = activeGame with
            {
                Ship = nextShip
            }
        };

        states[gameId] = nextState;
        await PublishStateChanged(gameId, nextState, cancellationToken);
    }

    public async Task StartEmScanAsync(
        string connectionId,
        double targetX,
        double targetY,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetGameForConnection(connectionId, out var gameId, out var state)
            || state?.Game is null)
        {
            return;
        }

        var activeGame = state.Game;
        var scanner = activeGame.Ship.Scanners.EmScanner;

        if (scanner.IsScanActive() || activeGame.Ship.BatteryBank.ChargeLevel <= 0)
        {
            return;
        }

        var tick = gameEngine.GetCurrentTick(gameId);
        var nextScanner = scanner.StartScan(
            tick,
            targetX,
            targetY,
            activeGame.World.JumpAreaMap);
        var nextShip = activeGame.Ship.WithScanners(
            activeGame.Ship.Scanners with
            {
                EmScanner = nextScanner
            });
        var nextState = state with
        {
            Game = activeGame with
            {
                Ship = nextShip
            }
        };

        states[gameId] = nextState;
        await PublishStateChanged(gameId, nextState, cancellationToken);
    }

    public async Task CaptureEmScanReportAsync(
        string connectionId,
        double focus,
        double filter,
        double phaseErrorRadians,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetGameForConnection(connectionId, out var gameId, out var state)
            || state?.Game is null)
        {
            return;
        }

        var activeGame = state.Game;
        var scanner = activeGame.Ship.Scanners.EmScanner;

        if (!scanner.IsScanActive())
        {
            return;
        }

        var tick = gameEngine.GetCurrentTick(gameId);
        var nextScanner = scanner.CaptureReport(
            tick,
            activeGame.World.JumpAreaMap,
            focus,
            filter,
            phaseErrorRadians);
        var nextShip = activeGame.Ship.WithScanners(
            activeGame.Ship.Scanners with
            {
                EmScanner = nextScanner
            });
        var nextState = state with
        {
            Game = activeGame with
            {
                Ship = nextShip
            }
        };

        states[gameId] = nextState;
        await PublishStateChanged(gameId, nextState, cancellationToken);
    }

    public async Task StopEmScanAsync(
        string connectionId,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetGameForConnection(connectionId, out var gameId, out var state)
            || state?.Game is null)
        {
            return;
        }

        var activeGame = state.Game;
        var scanner = activeGame.Ship.Scanners.EmScanner;

        if (!scanner.IsScanActive())
        {
            return;
        }

        var nextShip = activeGame.Ship.WithScanners(
            activeGame.Ship.Scanners with
            {
                EmScanner = scanner.StopScan()
            });
        var nextState = state with
        {
            Game = activeGame with
            {
                Ship = nextShip
            }
        };

        states[gameId] = nextState;
        await PublishStateChanged(gameId, nextState, cancellationToken);
    }

    public async Task ApplyTickAsync(
        Guid gameId,
        GameTick tick,
        CancellationToken cancellationToken = default)
    {
        if (!states.TryGetValue(gameId, out var state) || state.Game is null)
        {
            return;
        }

        var activeGame = state.Game;
        var scanner = activeGame.Ship.Scanners.EmScanner;
        var currentScan = scanner.CurrentScan;

        if (currentScan is null)
        {
            return;
        }

        var elapsedDrainIntervals =
            (tick.Tick - currentScan.LastPowerDrainedAtTick)
            / EmScanner.PowerDrainIntervalTicks;

        if (elapsedDrainIntervals <= 0)
        {
            return;
        }

        var requestedChargeCost = elapsedDrainIntervals * EmScanner.PowerDrainChargeLevel;
        var currentBattery = activeGame.Ship.BatteryBank;
        var nextBattery = currentBattery.DrainChargeLevel(requestedChargeCost);
        var nextScanner = currentBattery.ChargeLevel <= requestedChargeCost
            ? scanner.StopScan()
            : scanner.WithPowerDrainCheckpoint(
                currentScan.LastPowerDrainedAtTick
                + (elapsedDrainIntervals * EmScanner.PowerDrainIntervalTicks));
        var nextShip = activeGame.Ship
            .WithBatteryBank(nextBattery)
            .WithScanners(
                activeGame.Ship.Scanners with
                {
                    EmScanner = nextScanner
                });
        var nextState = state with
        {
            Game = activeGame with
            {
                Ship = nextShip
            }
        };

        states[gameId] = nextState;
        await PublishStateChanged(gameId, nextState, cancellationToken);
    }

    public void Disconnect(string connectionId)
    {
        DetachConnection(connectionId);
    }

    public IReadOnlyList<string> GetConnectionIds(Guid gameId)
    {
        return gameConnections.TryGetValue(gameId, out var connections)
            ? connections.Keys.ToArray()
            : [];
    }

    private bool TryGetGameForConnection(
        string connectionId,
        out Guid gameId,
        out GameState? state)
    {
        if (connectionGames.TryGetValue(connectionId, out gameId)
            && states.TryGetValue(gameId, out state))
        {
            return true;
        }

        var activeGameId = GetCurrentGameId();

        if (activeGameId is Guid currentGame
            && states.TryGetValue(currentGame, out state))
        {
            gameId = currentGame;
            AttachConnection(connectionId, currentGame);
            return true;
        }

        gameId = default;
        state = null;
        return false;
    }

    private void ReplaceCurrentGame(
        Guid gameId,
        GameState state,
        string connectionId)
    {
        Guid? previousGameId;

        lock (currentGameGate)
        {
            previousGameId = currentGameId;
            currentGameId = gameId;
        }

        var connectionIds = new HashSet<string>(StringComparer.Ordinal)
        {
            connectionId
        };

        if (previousGameId is Guid previousGame && previousGame != gameId)
        {
            foreach (var previousConnectionId in DetachGame(previousGame))
            {
                connectionIds.Add(previousConnectionId);
            }

            states.TryRemove(previousGame, out _);
            gameEngine.StopGame(previousGame);
        }

        states[gameId] = state;

        foreach (var connectedConnectionId in connectionIds)
        {
            AttachConnection(connectedConnectionId, gameId);
        }
    }

    private Guid? GetCurrentGameId()
    {
        lock (currentGameGate)
        {
            return currentGameId;
        }
    }

    private void AttachConnection(string connectionId, Guid gameId)
    {
        DetachConnection(connectionId);

        connectionGames[connectionId] = gameId;
        var connections = gameConnections.GetOrAdd(
            gameId,
            _ => new ConcurrentDictionary<string, byte>());
        connections[connectionId] = 0;
    }

    private void DetachConnection(string connectionId)
    {
        if (!connectionGames.TryRemove(connectionId, out var gameId))
        {
            return;
        }

        if (gameConnections.TryGetValue(gameId, out var connections))
        {
            connections.TryRemove(connectionId, out _);
        }
    }

    private IReadOnlyList<string> DetachGame(Guid gameId)
    {
        if (!gameConnections.TryRemove(gameId, out var connections))
        {
            return [];
        }

        var connectionIds = connections.Keys.ToArray();

        foreach (var connectionId in connectionIds)
        {
            if (connectionGames.TryGetValue(connectionId, out var mappedGameId)
                && mappedGameId == gameId)
            {
                connectionGames.TryRemove(connectionId, out _);
            }
        }

        return connectionIds;
    }

    private async Task PublishStateChanged(
        Guid gameId,
        GameState state,
        CancellationToken cancellationToken)
    {
        var envelope = await gameEventBus.PublishAsync(
            new GameStateChangedGameEvent(gameId, state),
            cancellationToken);

        logger.LogInformation(
            "Game state changed for game {GameId}: {Screen} (Sequence: {Sequence}).",
            gameId,
            state.Screen,
            envelope.Sequence);
    }

    private async Task PublishClientStateChanged(
        string connectionId,
        GameState state,
        CancellationToken cancellationToken)
    {
        var envelope = await gameEventBus.PublishAsync(
            new ClientGameStateChangedGameEvent(connectionId, state),
            cancellationToken);

        logger.LogInformation(
            "Client game state snapshot for connection {ConnectionId}: {Screen} (GameId: {GameId}, Sequence: {Sequence}).",
            connectionId,
            state.Screen,
            state.Game?.Id,
            envelope.Sequence);
    }
}
