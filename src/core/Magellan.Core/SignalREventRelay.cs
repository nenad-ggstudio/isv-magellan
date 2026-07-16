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
            else if (envelope.Event is GravityScanStartedGameEvent gravityScanStarted)
            {
                await PublishGravityScanner(gravityScanStarted.GameId);
            }
            else if (envelope.Event is EmScanStartedGameEvent emScanStarted)
            {
                await PublishEmScanner(emScanStarted.GameId);
            }
            else if (envelope.Event is EmScanReportCapturedGameEvent reportCaptured)
            {
                await PublishEmScanner(reportCaptured.GameId);
            }
            else if (envelope.Event is EmScanStoppedGameEvent emScanStopped)
            {
                await PublishEmScanner(emScanStopped.GameId);
            }
            else if (envelope.Event is EmScanPowerDrainedGameEvent powerDrained)
            {
                await PublishBatteryBank(powerDrained.GameId);
                await PublishEmScanner(powerDrained.GameId);
            }
            else if (envelope.Event is JumpCompletedGameEvent jumpCompleted)
            {
                await PublishGameState(jumpCompleted.GameId);
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

    private async Task PublishBatteryBank(Guid gameId)
    {
        if (!TryGetActiveGame(gameId, out var activeGame))
        {
            return;
        }

        foreach (var connectionId in gameManager.GetConnectionIds(gameId))
        {
            await gameHub.Clients
                .Client(connectionId)
                .BatteryBankChanged(activeGame.Ship.BatteryBank);
        }
    }

    private async Task PublishGravityScanner(Guid gameId)
    {
        if (!TryGetActiveGame(gameId, out var activeGame))
        {
            return;
        }

        foreach (var connectionId in gameManager.GetConnectionIds(gameId))
        {
            await gameHub.Clients
                .Client(connectionId)
                .GravityScannerChanged(activeGame.Ship.Scanners.GravityScanner);
        }
    }

    private async Task PublishEmScanner(Guid gameId)
    {
        if (!TryGetActiveGame(gameId, out var activeGame))
        {
            return;
        }

        foreach (var connectionId in gameManager.GetConnectionIds(gameId))
        {
            await gameHub.Clients
                .Client(connectionId)
                .EmScannerChanged(activeGame.Ship.Scanners.EmScanner);
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

    private bool TryGetActiveGame(Guid gameId, out ActiveGameState activeGame)
    {
        if (gameManager.TryGetClientState(gameId, out var state) && state?.Game is not null)
        {
            activeGame = state.Game;
            return true;
        }

        activeGame = null!;
        return false;
    }
}
