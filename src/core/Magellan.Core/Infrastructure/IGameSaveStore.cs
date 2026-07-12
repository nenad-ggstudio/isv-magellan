namespace Infrastructure;

public interface IGameSaveStore
{
    Task<bool> ExistsAsync(CancellationToken cancellationToken = default);

    Task<GameSave?> LoadAsync(CancellationToken cancellationToken = default);

    Task SaveAsync(GameSave save, CancellationToken cancellationToken = default);
}

public sealed record GameSave(
    int FormatVersion,
    DateTimeOffset SavedAt,
    GameTick Tick,
    GameState State)
{
    public const int CurrentFormatVersion = 1;
}
