using Events;
using Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using World;

namespace Magellan.Core.Tests;

public sealed class GameManagerTests
{
    [Fact]
    public async Task ConnectAsync_publishes_bootstrap_state_with_start_new_game_action()
    {
        var store = new InMemoryGameEventStore();
        var manager = CreateManager(store);

        await manager.ConnectAsync("connection-1");

        var envelope = await ReadSingle(store);
        var gameEvent = Assert.IsType<GameStateChangedGameEvent>(envelope.Event);

        Assert.Equal("connection-1", gameEvent.ConnectionId);
        Assert.Equal(GameScreens.Bootstrap, gameEvent.State.Screen);
        Assert.Null(gameEvent.State.Game);

        var action = Assert.Single(gameEvent.State.Actions);
        Assert.Equal(GameActions.StartNewGame, action.Id);
        Assert.Equal("New Game", action.Label);
    }

    [Fact]
    public async Task StartNewGameAsync_publishes_new_game_state()
    {
        var store = new InMemoryGameEventStore();
        var manager = CreateManager(store);

        await manager.StartNewGameAsync("connection-1");

        var envelope = await ReadSingle(store);
        var gameEvent = Assert.IsType<GameStateChangedGameEvent>(envelope.Event);
        var activeGame = gameEvent.State.Game;

        Assert.Equal(GameScreens.Game, gameEvent.State.Screen);
        Assert.Empty(gameEvent.State.Actions);
        Assert.NotNull(activeGame);
        Assert.Equal("Magellan Sector", activeGame!.Name);
        Assert.Equal(new GameResources(148, 62, 91), activeGame.Resources);

        var world = activeGame.World;

        Assert.Equal("Ship Origin", world.ShipPosition.Label);
        Assert.Equal(DistanceUnits.Kilometer, world.ShipPosition.Unit);
        Assert.Equal(activeGame.StartedAt, world.CurrentTime);

        Assert.Equal("long-range", world.LongRangeScan.Id);
        Assert.Equal(DistanceUnits.LightYear, world.LongRangeScan.DistanceUnit);
        Assert.Equal(4, world.LongRangeScan.Radius);
        Assert.Equal(5, world.LongRangeScan.Contacts.Count);
        Assert.Contains(
            world.LongRangeScan.Contacts,
            contact =>
                contact.Kind == SensorContactKinds.Star &&
                contact.Name == "Morrow Star");

        Assert.Equal("local-sector", world.LocalSectorScan.Id);
        Assert.Equal(DistanceUnits.Kilometer, world.LocalSectorScan.DistanceUnit);
        Assert.Equal(8_000, world.LocalSectorScan.Radius);
        Assert.Equal(4, world.LocalSectorScan.Contacts.Count);
        Assert.Contains(
            world.LocalSectorScan.Contacts,
            contact =>
                contact.Kind == SensorContactKinds.Debris &&
                contact.Name == "Silent Probe");

        Assert.All(
            world.LongRangeScan.Contacts.Concat(world.LocalSectorScan.Contacts),
            contact => Assert.True(contact.SignalAgeSeconds > 0));
    }

    private static GameManager CreateManager(IGameEventStore store)
    {
        var bus = new GameEventBus(store);
        var gameEngine = new GameEngine(bus, NullLogger<GameEngine>.Instance);

        return new GameManager(bus, gameEngine, NullLogger<GameManager>.Instance);
    }

    private static async Task<GameEventEnvelope> ReadSingle(IGameEventStore store)
    {
        await foreach (var envelope in store.ReadAsync())
        {
            return envelope;
        }

        throw new InvalidOperationException("The event store did not return an event.");
    }
}
