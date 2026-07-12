using System.Collections.Concurrent;
using Events;
using Infrastructure;

public sealed class GameEngine(
    IGameEventBus gameEventBus,
    ILogger<GameEngine> logger) : BackgroundService
{
    private static readonly TimeSpan TickRate = TimeSpan.FromMilliseconds(250);
    private readonly ConcurrentDictionary<Guid, GameSession> sessions = new();

    public void StartNewGame(Guid gameId, DateTimeOffset startedAt)
    {
        sessions[gameId] = new GameSession(startedAt, 0, 0);
    }

    public void ResumeGame(Guid gameId, GameTick savedTick)
    {
        sessions[gameId] = new GameSession(
            DateTimeOffset.UtcNow,
            savedTick.ElapsedMilliseconds,
            savedTick.Tick);
    }

    public void StopGame(Guid gameId)
    {
        sessions.TryRemove(gameId, out _);
    }

    public long GetCurrentTick(Guid gameId)
    {
        return sessions.TryGetValue(gameId, out var session)
            ? session.CurrentTick
            : 0;
    }

    public GameTick GetCurrentGameTick(Guid gameId)
    {
        return sessions.TryGetValue(gameId, out var session)
            ? session.Snapshot()
            : new GameTick(0, 0);
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

        foreach (var (gameId, session) in sessions)
        {
            var nextTick = session.NextTick(now);

            try
            {
                await gameEventBus.PublishAsync(
                    new TickGameEvent(gameId, nextTick),
                    stoppingToken);
            }
            catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
            {
                logger.LogWarning(
                    exception,
                    "Unable to publish game tick event for game {GameId}.",
                    gameId);
            }
        }
    }

    private sealed class GameSession(
        DateTimeOffset resumedAt,
        long elapsedMilliseconds,
        long currentTick)
    {
        private readonly Lock syncRoot = new();
        private long tick = currentTick;

        public long CurrentTick
        {
            get
            {
                lock (syncRoot)
                {
                    return tick;
                }
            }
        }

        public GameTick Snapshot()
        {
            lock (syncRoot)
            {
                return CreateTick(DateTimeOffset.UtcNow, tick);
            }
        }

        public GameTick NextTick(DateTimeOffset now)
        {
            lock (syncRoot)
            {
                tick++;
                return CreateTick(now, tick);
            }
        }

        private GameTick CreateTick(DateTimeOffset now, long tickValue)
        {
            return new GameTick(
                elapsedMilliseconds
                + Math.Max(0, (long)(now - resumedAt).TotalMilliseconds),
                tickValue);
        }
    }
}
