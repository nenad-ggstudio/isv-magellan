using System.Collections.Concurrent;
using Events;
using Infrastructure;

public sealed class GameEngine(
    IGameEventBus gameEventBus,
    ILogger<GameEngine> logger) : BackgroundService
{
    private static readonly TimeSpan TickRate = TimeSpan.FromMilliseconds(250);
    private readonly ConcurrentDictionary<string, GameSession> sessions = new();

    public void StartNewGame(string connectionId)
    {
        sessions[connectionId] = new GameSession(DateTimeOffset.UtcNow);
    }

    public void StopGame(string connectionId)
    {
        sessions.TryRemove(connectionId, out _);
    }

    public long GetCurrentTick(string connectionId)
    {
        return sessions.TryGetValue(connectionId, out var session)
            ? session.CurrentTick
            : 0;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TickRate);

        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                await PublishTicks(stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal host shutdown interrupts the periodic timer wait.
        }
    }

    private async Task PublishTicks(CancellationToken stoppingToken)
    {
        var now = DateTimeOffset.UtcNow;

        foreach (var (connectionId, session) in sessions)
        {
            var nextTick = session.NextTick(now);

            try
            {
                await gameEventBus.PublishAsync(
                    new TickGameEvent(connectionId, nextTick),
                    stoppingToken);
            }
            catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
            {
                logger.LogWarning(
                    exception,
                    "Unable to publish game tick event for connection {ConnectionId}.",
                    connectionId);
            }
        }
    }

    private sealed class GameSession(DateTimeOffset startedAt)
    {
        private long tick;

        public long CurrentTick => Interlocked.Read(ref tick);

        public GameTick NextTick(DateTimeOffset now)
        {
            return new GameTick(
                (long)(now - startedAt).TotalMilliseconds,
                Interlocked.Increment(ref tick));
        }
    }
}
