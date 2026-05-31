using Infrastructure;
using Microsoft.AspNetCore.SignalR;

public sealed class GameHub(GameManager gameManager) : Hub<IGameClient>
{
    public Task StartNewGame()
    {
        return gameManager.StartNewGameAsync(Context.ConnectionId);
    }

    public Task GetGameState()
    {
        return gameManager.ConnectAsync(Context.ConnectionId);
    }

    public Task StartGravityScan()
    {
        return gameManager.StartGravityScanAsync(Context.ConnectionId);
    }

    public Task StartEmScan(double x, double y)
    {
        return gameManager.StartEmScanAsync(Context.ConnectionId, x, y);
    }

    public Task CaptureEmScanReport(double focus, double filter, double phaseErrorRadians)
    {
        return gameManager.CaptureEmScanReportAsync(
            Context.ConnectionId,
            focus,
            filter,
            phaseErrorRadians);
    }

    public Task StopEmScan()
    {
        return gameManager.StopEmScanAsync(Context.ConnectionId);
    }

    public override async Task OnConnectedAsync()
    {
        await gameManager.ConnectAsync(Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        gameManager.Disconnect(Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}
