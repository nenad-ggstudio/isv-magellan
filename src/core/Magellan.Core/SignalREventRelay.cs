using Events;
using Infrastructure;
using Microsoft.AspNetCore.SignalR;

public sealed class SignalREventRelay(
    IGameEventBus gameEventBus,
    IHubContext<GameHub, IGameClient> gameHub,
    GameManager gameManager,
    ILogger<SignalREventRelay> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var envelope in gameEventBus.SubscribeAsync(
                gameEventBus.CurrentSequence,
                stoppingToken))
            {
                await PublishToSignalR(envelope, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal host shutdown interrupts the subscription.
        }
    }

    private async Task PublishToSignalR(GameEventEnvelope envelope, CancellationToken stoppingToken)
    {
        try
        {
            if (envelope.Event is GameStateChangedGameEvent stateChanged)
            {
                var state = ClientGameStateProjection.ForClient(stateChanged.State);

                foreach (var connectionId in gameManager.GetConnectionIds(stateChanged.GameId))
                {
                    await gameHub.Clients
                        .Client(connectionId)
                        .GameStateChanged(state);
                }
            }
            else if (envelope.Event is ClientGameStateChangedGameEvent clientStateChanged)
            {
                await gameHub.Clients
                    .Client(clientStateChanged.ConnectionId)
                    .GameStateChanged(ClientGameStateProjection.ForClient(clientStateChanged.State));
            }
            else if (envelope.Event is TickGameEvent gameTick)
            {
                foreach (var connectionId in gameManager.GetConnectionIds(gameTick.GameId))
                {
                    await gameHub.Clients.Client(connectionId).GameTick(gameTick.Tick);
                }
            }
        }
        catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
        {
            logger.LogWarning(
                exception,
                "Unable to publish game event {Sequence} for game {GameId}.",
                envelope.Sequence,
                envelope.Event.GameId);
        }
    }
}
