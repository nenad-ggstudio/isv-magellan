using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;

public sealed class GameEngine(
    IHubContext<GameHub, IGameClient> gameHub,
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
                await gameHub.Clients.Client(connectionId).GameTick(nextTick);
            }
            catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
            {
                logger.LogWarning(
                    exception,
                    "Unable to publish game tick to connection {ConnectionId}.",
                    connectionId);
            }
        }
    }

    private sealed class GameSession(DateTimeOffset startedAt)
    {
        private long tick;

        public GameTick NextTick(DateTimeOffset now)
        {
            return new GameTick(
                (long)(now - startedAt).TotalMilliseconds,
                Interlocked.Increment(ref tick));
        }
    }
}
