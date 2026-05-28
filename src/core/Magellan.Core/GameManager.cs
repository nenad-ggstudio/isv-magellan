using System.Collections.Concurrent;
using Events;
using Infrastructure;

public sealed class GameManager(
    IGameEventBus gameEventBus,
    GameEngine gameEngine,
    ILogger<GameManager> logger)
{
    private readonly ConcurrentDictionary<string, GameState> states = new();

    public async Task ConnectAsync(
        string connectionId,
        CancellationToken cancellationToken = default)
    {
        var state = states.GetOrAdd(connectionId, _ => GameState.Bootstrap());
        await PublishStateChanged(connectionId, state, cancellationToken);
    }

    public async Task StartNewGameAsync(
        string connectionId,
        CancellationToken cancellationToken = default)
    {
        var state = GameState.NewGame(Guid.NewGuid(), DateTimeOffset.UtcNow);

        states[connectionId] = state;
        await PublishStateChanged(connectionId, state, cancellationToken);

        gameEngine.StartNewGame(connectionId);
    }

    public async Task StartGravityScanAsync(
        string connectionId,
        CancellationToken cancellationToken = default)
    {
        if (!states.TryGetValue(connectionId, out var state) || state.Game is null)
        {
            return;
        }

        var tick = gameEngine.GetCurrentTick(connectionId);
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

        states[connectionId] = nextState;
        await PublishStateChanged(connectionId, nextState, cancellationToken);
    }

    public void Disconnect(string connectionId)
    {
        states.TryRemove(connectionId, out _);
        gameEngine.StopGame(connectionId);
    }

    private async Task PublishStateChanged(
        string connectionId,
        GameState state,
        CancellationToken cancellationToken)
    {
        var envelope = await gameEventBus.PublishAsync(
            new GameStateChangedGameEvent(connectionId, state),
            cancellationToken);

        logger.LogInformation(
            "Game state changed for connection {ConnectionId}: {Screen} (GameId: {GameId}, Sequence: {Sequence}).",
            connectionId,
            state.Screen,
            state.Game?.Id,
            envelope.Sequence);
    }
}
