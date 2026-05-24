namespace Infrastructure;

public interface IGameClient
{
    Task GameStateChanged(GameState state);

    Task GameTick(GameTick tick);
}
