using Events;
using Infrastructure;

namespace Magellan.Core.Tests.Infrastructure;

public sealed class GameEventBusTests
{
    [Fact]
    public async Task SubscribeAsync_replays_published_events()
    {
        var bus = new GameEventBus(new InMemoryGameEventStore());
        var published = await bus.PublishAsync(
            new TickGameEvent("connection-1", new GameTick(250, 1)));

        var received = await ReadSingle(bus);

        Assert.Equal(published, received);
    }

    [Fact]
    public async Task SubscribeAsync_starts_after_requested_sequence()
    {
        var bus = new GameEventBus(new InMemoryGameEventStore());
        var first = await bus.PublishAsync(
            new TickGameEvent("connection-1", new GameTick(250, 1)));
        var second = await bus.PublishAsync(
            new TickGameEvent("connection-1", new GameTick(500, 2)));

        var received = await ReadSingle(bus, first.Sequence);

        Assert.Equal(second, received);
    }

    private static async Task<GameEventEnvelope> ReadSingle(
        IGameEventBus bus,
        long afterSequence = 0)
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));

        await foreach (var envelope in bus.SubscribeAsync(afterSequence, timeout.Token))
        {
            return envelope;
        }

        throw new InvalidOperationException("The event bus did not return an event.");
    }
}
