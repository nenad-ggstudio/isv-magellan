using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using System.Threading.Channels;

namespace Infrastructure;

public sealed class GameEventBus(IGameEventStore store) : IGameEventBus
{
    private readonly ConcurrentDictionary<long, Channel<GameEventEnvelope>> subscribers = new();
    private long nextSubscriberId;

    public long CurrentSequence => store.CurrentSequence;

    public async ValueTask<GameEventEnvelope> PublishAsync(
        GameEvent gameEvent,
        CancellationToken cancellationToken = default)
    {
        var envelope = await store.AppendAsync(gameEvent, cancellationToken);

        foreach (var (subscriberId, channel) in subscribers)
        {
            try
            {
                await channel.Writer.WriteAsync(envelope, cancellationToken);
            }
            catch (ChannelClosedException)
            {
                subscribers.TryRemove(subscriberId, out _);
            }
        }

        return envelope;
    }

    public async IAsyncEnumerable<GameEventEnvelope> SubscribeAsync(
        long afterSequence = 0,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var subscriberId = Interlocked.Increment(ref nextSubscriberId);
        var channel = Channel.CreateUnbounded<GameEventEnvelope>(
            new UnboundedChannelOptions
            {
                SingleReader = true,
                SingleWriter = false,
                AllowSynchronousContinuations = false
            });

        subscribers[subscriberId] = channel;

        try
        {
            var lastSequence = afterSequence;

            await foreach (var gameEvent in store.ReadAsync(afterSequence, cancellationToken))
            {
                lastSequence = gameEvent.Sequence;
                yield return gameEvent;
            }

            await foreach (var gameEvent in channel.Reader.ReadAllAsync(cancellationToken))
            {
                if (gameEvent.Sequence <= lastSequence)
                {
                    continue;
                }

                lastSequence = gameEvent.Sequence;
                yield return gameEvent;
            }
        }
        finally
        {
            subscribers.TryRemove(subscriberId, out _);
            channel.Writer.TryComplete();
        }
    }
}
