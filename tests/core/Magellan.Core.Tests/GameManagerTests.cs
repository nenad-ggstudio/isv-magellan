using Events;
using Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using World;
using World.SpaceObjects.Asteroids;

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
        Assert.Equal(
            new GameResources(
                new GameResource(0.04),
                new GameResource(0.02),
                new GameResource(0.01)),
            activeGame.Resources);

        var ship = activeGame.Ship;

        Assert.Equal("ISV Magellan", ship.Name);
        Assert.Equal(10, ship.StorageUnits.Count);
        Assert.All(
            ship.StorageUnits,
            unit => Assert.Equal(100, unit.CapacityKilograms));
        Assert.Equal(
            Enumerable.Range(1, 10),
            ship.StorageUnits.Select(unit => unit.SlotNumber));
        Assert.Equal(4, ship.StorageUnits.Count(unit => unit.Contents is not null));
        Assert.Contains(
            ship.StorageUnits,
            unit =>
                unit.Contents?.Resource == "lithium" &&
                unit.Contents.QuantityKilograms == 22 &&
                unit.Contents.PurityLevel == 0.98);

        var world = activeGame.World;

        Assert.Equal("Ship Origin", world.ShipPosition.Label);
        Assert.Equal(DistanceUnits.Kilometer, world.ShipPosition.Unit);
        Assert.Equal(activeGame.StartedAt, world.CurrentTime);

        Assert.Equal("long-range", world.LongRangeScan.Id);
        Assert.Equal(DistanceUnits.LightYear, world.LongRangeScan.DistanceUnit);
        Assert.Equal(4, world.LongRangeScan.Radius);
        Assert.Equal(5, world.LongRangeScan.Contacts.Count);
        Assert.All(
            world.LongRangeScan.Contacts,
            contact =>
            {
                Assert.Equal(Asteroid.ObjectKind, contact.Kind);
                Assert.EndsWith("-type", contact.AsteroidTypeId);
                Assert.Empty(contact.ResourceEstimates);
            });

        Assert.Equal("local-sector", world.LocalSectorScan.Id);
        Assert.Equal(DistanceUnits.Kilometer, world.LocalSectorScan.DistanceUnit);
        Assert.Equal(8_000, world.LocalSectorScan.Radius);
        Assert.Equal(4, world.LocalSectorScan.Contacts.Count);
        Assert.All(
            world.LocalSectorScan.Contacts,
            contact =>
            {
                Assert.Equal(Asteroid.ObjectKind, contact.Kind);
                Assert.Equal(3, contact.ResourceEstimates.Count);
                Assert.Contains(
                    contact.ResourceEstimates,
                    estimate => estimate.Resource == ResourceNames.Water);
                Assert.Contains(
                    contact.ResourceEstimates,
                    estimate => estimate.Resource == ResourceNames.Lithium);
                Assert.Contains(
                    contact.ResourceEstimates,
                    estimate => estimate.Resource == ResourceNames.Carbon);
            });

        Assert.All(
            world.LongRangeScan.Contacts.Concat(world.LocalSectorScan.Contacts),
            contact => Assert.True(contact.SignalAgeSeconds > 0));

        Assert.Contains(
            world.LocalSectorScan.Contacts,
            contact =>
                contact.AsteroidTypeId == AsteroidTypes.MType.Id &&
                contact.ResourceEstimates.Any(
                    estimate =>
                        estimate.Resource == ResourceNames.Lithium &&
                        estimate.Label == "lots"));
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
