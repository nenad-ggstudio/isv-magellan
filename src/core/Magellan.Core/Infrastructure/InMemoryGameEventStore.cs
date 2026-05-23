using System.Runtime.CompilerServices;

namespace Infrastructure;

public sealed class InMemoryGameEventStore : IGameEventStore
{
    private readonly Lock syncRoot = new();
    private readonly List<GameEventEnvelope> events = [];
    private long sequence;

    public long CurrentSequence => Interlocked.Read(ref sequence);

    public ValueTask<GameEventEnvelope> AppendAsync(
        GameEvent gameEvent,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        lock (syncRoot)
        {
            var envelope = new GameEventEnvelope(
                ++sequence,
                DateTimeOffset.UtcNow,
                gameEvent);

            events.Add(envelope);
            return ValueTask.FromResult(envelope);
        }
    }

    public async IAsyncEnumerable<GameEventEnvelope> ReadAsync(
        long afterSequence = 0,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        GameEventEnvelope[] snapshot;

        lock (syncRoot)
        {
            snapshot = events
                .Where(gameEvent => gameEvent.Sequence > afterSequence)
                .ToArray();
        }

        foreach (var gameEvent in snapshot)
        {
            cancellationToken.ThrowIfCancellationRequested();
            yield return gameEvent;
        }

        await Task.CompletedTask;
    }
}
