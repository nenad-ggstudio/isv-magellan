namespace Infrastructure;

public sealed class InMemoryGameSaveStore : IGameSaveStore
{
    private GameSave? save;

    public Task<bool> ExistsAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(save is not null);
    }

    public Task<GameSave?> LoadAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(save);
    }

    public Task SaveAsync(GameSave nextSave, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        save = nextSave;
        return Task.CompletedTask;
    }
}
