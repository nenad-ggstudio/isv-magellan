using Events;
using Infrastructure;

public sealed class GameStateTickProcessor(
    IGameEventBus gameEventBus,
    GameManager gameManager,
    ILogger<GameStateTickProcessor> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var envelope in gameEventBus.SubscribeAsync(
                gameEventBus.CurrentSequence,
                stoppingToken))
            {
                if (envelope.Event is not TickGameEvent tickEvent)
                {
                    continue;
                }

                try
                {
                    await gameManager.ApplyTickAsync(
                        tickEvent.GameId,
                        tickEvent.Tick,
                        stoppingToken);
                }
                catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
                {
                    logger.LogWarning(
                        exception,
                        "Unable to process game state tick {Tick} for game {GameId}.",
                        tickEvent.Tick.Tick,
                        tickEvent.GameId);
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal host shutdown interrupts the subscription.
        }
    }
}
