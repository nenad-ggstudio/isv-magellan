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

        var fusionCore = ship.FusionCore;

        Assert.Equal("deuterium", fusionCore.DeuteriumReservoir.Fuel);
        Assert.Equal(100, fusionCore.DeuteriumReservoir.CapacityKilograms);
        Assert.Equal(86, fusionCore.DeuteriumReservoir.QuantityKilograms);
        Assert.Equal(0.97, fusionCore.DeuteriumReservoir.PurityLevel);

        Assert.Equal("tritium", fusionCore.TritiumReservoir.Fuel);
        Assert.Equal(100, fusionCore.TritiumReservoir.CapacityKilograms);
        Assert.Equal(64, fusionCore.TritiumReservoir.QuantityKilograms);
        Assert.Equal(0.95, fusionCore.TritiumReservoir.PurityLevel);

        Assert.Equal("water", fusionCore.CoolantTank.Coolant);
        Assert.Equal(10_000, fusionCore.CoolantTank.CapacityKilograms);
        Assert.Equal(7_600, fusionCore.CoolantTank.QuantityKilograms);
        Assert.Equal(0.92, fusionCore.CoolantTank.PurityLevel);

        var batteryBank = ship.BatteryBank;

        Assert.Equal(5_000, batteryBank.DesignCapacityKilowattHours);
        Assert.Equal(0.74, batteryBank.ChargeLevel);
        Assert.Equal(0.91, batteryBank.HealthLevel);
        Assert.Equal(4_550, batteryBank.MaxCapacityKilowattHours, precision: 3);
        Assert.Equal(3_367, batteryBank.StoredKilowattHours, precision: 3);

        var world = activeGame.World;

        Assert.Equal("Solar System", world.ShipPosition.Label);
        Assert.Equal(DistanceUnits.LightYear, world.ShipPosition.Unit);
        Assert.Equal(activeGame.StartedAt, world.CurrentTime);

        Assert.Equal("long-range-map", world.LongRangeMap.Id);
        Assert.Equal(DistanceUnits.LightYear, world.LongRangeMap.DistanceUnit);
        Assert.Equal(22, world.LongRangeMap.Width);
        Assert.Equal(22, world.LongRangeMap.Height);
        Assert.Equal(7, world.LongRangeMap.Systems.Count);
        Assert.All(
            world.LongRangeMap.Systems,
            system =>
            {
                Assert.NotEmpty(system.Name);
                Assert.True(system.Distance >= 0);
                Assert.Equal(3, system.ResourceDetections.Count);
            });

        Assert.Equal("jump-area", world.JumpAreaMap.Id);
        Assert.Equal("Jump Area", world.JumpAreaMap.Label);
        Assert.Equal(DistanceUnits.LightYear, world.JumpAreaMap.DistanceUnit);
        Assert.Equal(2, world.JumpAreaMap.Width);
        Assert.Equal(2, world.JumpAreaMap.Height);

        var jumpAreaSystem = Assert.Single(world.JumpAreaMap.Systems);

        Assert.Equal("solar-system", jumpAreaSystem.Id);
        Assert.Equal(1, jumpAreaSystem.X);
        Assert.Equal(1, jumpAreaSystem.Y);
        Assert.Equal(0, jumpAreaSystem.Distance);

        Assert.InRange(world.JumpAreaMap.Anomalies.Count, 5, 6);
        Assert.All(
            world.JumpAreaMap.Anomalies,
            anomaly =>
            {
                Assert.StartsWith("jump-anomaly-", anomaly.Id);
                Assert.Contains(
                    anomaly.Kind,
                    new[]
                    {
                        SensorAnomalyKinds.RoguePlanet,
                        SensorAnomalyKinds.AsteroidCluster,
                        SensorAnomalyKinds.Comet,
                        SensorAnomalyKinds.EnergyParticleWells
                    });
                Assert.NotEmpty(anomaly.Label);
                Assert.InRange(anomaly.X, 0, world.JumpAreaMap.Width);
                Assert.InRange(anomaly.Y, 0, world.JumpAreaMap.Height);
                Assert.InRange(anomaly.Distance, 0, world.JumpAreaMap.Width / 2);
            });

        Assert.Equal("local-map", world.LocalMap.Id);
        Assert.Equal("Local Map", world.LocalMap.Label);
        Assert.Equal(DistanceUnits.Kilometer, world.LocalMap.DistanceUnit);
        Assert.Equal(10_000, world.LocalMap.Radius);
        Assert.InRange(world.LocalMap.Contacts.Count, 12, 18);
        Assert.Equal(
            world.LocalMap.Contacts.Count,
            world.LocalMap.Contacts.Select(contact => contact.Id).Distinct().Count());
        Assert.Contains(
            world.LocalMap.Contacts,
            contact => contact.AsteroidTypeId == AsteroidTypes.CType.Id);
        Assert.Contains(
            world.LocalMap.Contacts,
            contact => contact.AsteroidTypeId == AsteroidTypes.SType.Id);
        Assert.Contains(
            world.LocalMap.Contacts,
            contact => contact.AsteroidTypeId == AsteroidTypes.MType.Id);
        Assert.All(
            world.LocalMap.Contacts,
            contact =>
            {
                Assert.Equal(Asteroid.ObjectKind, contact.Kind);
                Assert.Matches("^[CSM]-Type [0-9]{2}$", contact.Name);
                Assert.InRange(contact.Distance, 0, world.LocalMap.Radius);
                Assert.True(contact.SpeedKilometersPerSecond > 0);
                Assert.InRange(contact.DirectionDegrees, 0, 360);
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
            world.LocalMap.Contacts,
            contact => Assert.True(contact.SignalAgeSeconds > 0));

        Assert.Contains(
            world.LocalMap.Contacts,
            contact =>
                contact.AsteroidTypeId == AsteroidTypes.MType.Id &&
                contact.ResourceEstimates.Any(
                    estimate =>
                        estimate.Resource == ResourceNames.Lithium &&
                        estimate.Label == "lots"));
    }

    [Fact]
    public void StartingWorld_generates_local_asteroids_from_seed()
    {
        var startedAt = new DateTimeOffset(2187, 1, 2, 3, 4, 5, TimeSpan.Zero);
        var firstWorld = GameWorld.StartingWorld(startedAt);
        var secondWorld = GameWorld.StartingWorld(startedAt);
        var laterWorld = GameWorld.StartingWorld(startedAt.AddMilliseconds(1));

        Assert.Equal(
            firstWorld.LocalMap.Contacts.Select(contact => (contact.Id, contact.X, contact.Y)),
            secondWorld.LocalMap.Contacts.Select(contact => (contact.Id, contact.X, contact.Y)));
        Assert.NotEqual(
            firstWorld.LocalMap.Contacts.Select(contact => (contact.Id, contact.X, contact.Y)),
            laterWorld.LocalMap.Contacts.Select(contact => (contact.Id, contact.X, contact.Y)));
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
