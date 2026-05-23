namespace Infrastructure;

public interface IGameEventStore
{
    long CurrentSequence { get; }

    ValueTask<GameEventEnvelope> AppendAsync(
        GameEvent gameEvent,
        CancellationToken cancellationToken = default);

    IAsyncEnumerable<GameEventEnvelope> ReadAsync(
        long afterSequence = 0,
        CancellationToken cancellationToken = default);
}
