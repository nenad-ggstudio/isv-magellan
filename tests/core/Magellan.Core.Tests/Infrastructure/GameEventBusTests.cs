using Events;
using Infrastructure;

namespace Magellan.Core.Tests.Infrastructure;

public sealed class GameEventBusTests
{
    private static readonly Guid TestGameId =
        Guid.Parse("9a7472e9-ec4b-4183-b1c7-2df71162e03a");

    [Fact]
    public async Task SubscribeAsync_replays_published_events()
    {
        var bus = new GameEventBus(new InMemoryGameEventStore());
        var published = await bus.PublishAsync(
            new TickGameEvent(TestGameId, new GameTick(250, 1)));

        var received = await ReadSingle(bus);

        Assert.Equal(published, received);
    }

    [Fact]
    public async Task SubscribeAsync_starts_after_requested_sequence()
    {
        var bus = new GameEventBus(new InMemoryGameEventStore());
        var first = await bus.PublishAsync(
            new TickGameEvent(TestGameId, new GameTick(250, 1)));
        var second = await bus.PublishAsync(
            new TickGameEvent(TestGameId, new GameTick(500, 2)));

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
