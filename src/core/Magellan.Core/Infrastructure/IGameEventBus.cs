namespace Infrastructure;

public interface IGameEventBus
{
    long CurrentSequence { get; }

    ValueTask<GameEventEnvelope> PublishAsync(
        GameEvent gameEvent,
        CancellationToken cancellationToken = default);

    IAsyncEnumerable<GameEventEnvelope> SubscribeAsync(
        long afterSequence = 0,
        CancellationToken cancellationToken = default);
}
