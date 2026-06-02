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
            if (envelope.Event is GameStartedGameEvent gameStarted)
            {
                await PublishGameState(gameStarted.GameId);
            }
            else if (envelope.Event is GameStateChangedGameEvent stateChanged)
            {
                await PublishGameState(stateChanged.GameId, stateChanged.State);
            }
            else if (envelope.Event is ClientGameStateChangedGameEvent clientStateChanged)
            {
                await gameHub.Clients
                    .Client(clientStateChanged.ConnectionId)
                    .GameStateChanged(ClientGameStateProjection.ForClient(clientStateChanged.State));
            }
            else if (envelope.Event is GravityScannerChangedGameEvent gravityScannerChanged)
            {
                foreach (var connectionId in gameManager.GetConnectionIds(
                    gravityScannerChanged.GameId))
                {
                    await gameHub.Clients
                        .Client(connectionId)
                        .GravityScannerChanged(gravityScannerChanged.GravityScanner);
                }
            }
            else if (envelope.Event is EmScannerChangedGameEvent emScannerChanged)
            {
                foreach (var connectionId in gameManager.GetConnectionIds(
                    emScannerChanged.GameId))
                {
                    await gameHub.Clients
                        .Client(connectionId)
                        .EmScannerChanged(emScannerChanged.EmScanner);
                }
            }
            else if (envelope.Event is EmScanPowerDrainedGameEvent powerDrained)
            {
                foreach (var connectionId in gameManager.GetConnectionIds(powerDrained.GameId))
                {
                    var client = gameHub.Clients.Client(connectionId);

                    await client.BatteryBankChanged(powerDrained.BatteryBank);
                    await client.EmScannerChanged(powerDrained.EmScanner);
                }
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

    private async Task PublishGameState(Guid gameId, GameState? state = null)
    {
        if (state is null)
        {
            if (!gameManager.TryGetClientState(gameId, out state) || state is null)
            {
                return;
            }
        }

        var clientState = ClientGameStateProjection.ForClient(state);

        foreach (var connectionId in gameManager.GetConnectionIds(gameId))
        {
            await gameHub.Clients
                .Client(connectionId)
                .GameStateChanged(clientState);
        }
    }
}
