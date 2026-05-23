namespace Infrastructure;

public interface IGameClient
{
    Task GameTick(GameTick tick);
}
