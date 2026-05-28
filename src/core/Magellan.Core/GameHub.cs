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
