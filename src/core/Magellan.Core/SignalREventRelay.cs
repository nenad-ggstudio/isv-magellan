using Events;
using Infrastructure;
using Microsoft.AspNetCore.SignalR;

public sealed class SignalREventRelay(
    IGameEventBus gameEventBus,
    IHubContext<GameHub, IGameClient> gameHub,
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
                await gameHub.Clients
                    .Client(stateChanged.ConnectionId)
                    .GameStateChanged(stateChanged.State);
            }
            else if (envelope.Event is TickGameEvent gameTick)
            {
                await gameHub.Clients.Client(gameTick.ConnectionId).GameTick(gameTick.Tick);
            }
        }
        catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
        {
            logger.LogWarning(
                exception,
                "Unable to publish game event {Sequence} to connection {ConnectionId}.",
                envelope.Sequence,
                envelope.Event.ConnectionId);
        }
    }
}
