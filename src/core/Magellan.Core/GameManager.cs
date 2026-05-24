using System.Collections.Concurrent;
using Events;
using Infrastructure;

public sealed class GameManager(
    IGameEventBus gameEventBus,
    GameEngine gameEngine)
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
        await gameEventBus.PublishAsync(
            new GameStateChangedGameEvent(connectionId, state),
            cancellationToken);
    }
}
