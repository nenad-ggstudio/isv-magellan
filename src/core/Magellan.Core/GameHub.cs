using Infrastructure;
using Microsoft.AspNetCore.SignalR;

public sealed class GameHub(GameEngine gameEngine) : Hub<IGameClient>
{
    public Task StartNewGame()
    {
        gameEngine.StartNewGame(Context.ConnectionId);
        return Task.CompletedTask;
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        gameEngine.StopGame(Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}
