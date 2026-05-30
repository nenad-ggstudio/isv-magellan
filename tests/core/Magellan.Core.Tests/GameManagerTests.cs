using Events;
using Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Ship.Scanners;
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

        var gravityScanner = ship.Scanners.GravityScanner;

        Assert.Equal("gravity-scanner", gravityScanner.Id);
        Assert.Equal("Gravity Scanner", gravityScanner.Label);
        Assert.Equal(40, gravityScanner.ScanDurationTicks);
        Assert.Null(gravityScanner.CurrentScan);

        var emScanner = ship.Scanners.EmScanner;

        Assert.Equal("em-scanner", emScanner.Id);
        Assert.Equal("EM Scanner", emScanner.Label);
        Assert.Equal(0.1, emScanner.ScanRadiusLightYears, precision: 3);
        Assert.Empty(emScanner.Reports);
        Assert.Null(emScanner.CurrentScan);

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
                Assert.InRange(anomaly.Speed, 0, 6.4);
                Assert.InRange(anomaly.Angle, 0, Math.Tau);
                Assert.InRange(anomaly.Distortion, 0, 1);
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
    public async Task StartGravityScanAsync_publishes_scanner_scan_with_heat_map()
    {
        var store = new InMemoryGameEventStore();
        var manager = CreateManager(store);

        await manager.StartNewGameAsync("connection-1");
        await manager.StartGravityScanAsync("connection-1");

        var events = await ReadAll(store);
        var scanEvent = Assert.IsType<GameStateChangedGameEvent>(events.Last().Event);
        var scanner = scanEvent.State.Game?.Ship.Scanners.GravityScanner;

        Assert.NotNull(scanner);

        var currentScan = scanner!.CurrentScan;

        Assert.NotNull(currentScan);
        Assert.Equal(0, currentScan!.StartedAtTick);
        Assert.Equal(40, currentScan.CompletesAtTick);
        Assert.Equal(0, currentScan.Result.GeneratedAtTick);
        Assert.InRange(currentScan.Result.NoiseLevel, 0, 1);
        Assert.Equal(192, currentScan.Result.HeatMap.Columns);
        Assert.Equal(192, currentScan.Result.HeatMap.Rows);
        Assert.Equal(2, currentScan.Result.HeatMap.Width);
        Assert.Equal(2, currentScan.Result.HeatMap.Height);
        Assert.Equal(192 * 192, currentScan.Result.HeatMap.Values.Count);
        Assert.All(
            currentScan.Result.HeatMap.Values,
            value => Assert.InRange(value, 0, 1));
        Assert.Contains(
            currentScan.Result.HeatMap.Values,
            value => value > 0.8);

        var heatMap = currentScan.Result.HeatMap;
        var centerIndex = ((heatMap.Rows / 2) * heatMap.Columns) + (heatMap.Columns / 2);

        Assert.True(heatMap.Values[centerIndex] > heatMap.Values[0]);
    }

    [Fact]
    public async Task StartGravityScanAsync_does_not_restart_active_scan()
    {
        var store = new InMemoryGameEventStore();
        var manager = CreateManager(store);

        await manager.StartNewGameAsync("connection-1");
        await manager.StartGravityScanAsync("connection-1");
        await manager.StartGravityScanAsync("connection-1");

        var events = await ReadAll(store);

        Assert.Equal(2, events.Count);
    }

    [Fact]
    public async Task StartEmScanAsync_publishes_active_scan_with_clamped_target()
    {
        var store = new InMemoryGameEventStore();
        var manager = CreateManager(store);

        await manager.StartNewGameAsync("connection-1");
        await manager.StartEmScanAsync("connection-1", -0.5, 3.4);

        var events = await ReadAll(store);
        var scanEvent = Assert.IsType<GameStateChangedGameEvent>(events.Last().Event);
        var scanner = scanEvent.State.Game?.Ship.Scanners.EmScanner;

        Assert.NotNull(scanner);

        var currentScan = scanner!.CurrentScan;

        Assert.NotNull(currentScan);
        Assert.StartsWith("em-scan-", currentScan!.Id);
        Assert.Equal(0, currentScan.StartedAtTick);
        Assert.Equal(0, currentScan.LastPowerDrainedAtTick);
        Assert.Equal(0, currentScan.Target.X);
        Assert.Equal(2, currentScan.Target.Y);
        Assert.Equal(0.1, currentScan.RadiusLightYears, precision: 3);
        Assert.Empty(scanner.Reports);
        Assert.InRange(currentScan.SignalProfile.BaseStrength, 0, 1);
        Assert.InRange(currentScan.SignalProfile.NoiseLevel, 0, 1);
    }

    [Fact]
    public async Task StartEmScanAsync_does_not_restart_active_scan()
    {
        var store = new InMemoryGameEventStore();
        var manager = CreateManager(store);

        await manager.StartNewGameAsync("connection-1");
        await manager.StartEmScanAsync("connection-1", 0.2, 0.4);
        await manager.StartEmScanAsync("connection-1", 1.5, 1.6);

        var events = await ReadAll(store);

        Assert.Equal(2, events.Count);
    }

    [Fact]
    public async Task StopEmScanAsync_clears_active_scan()
    {
        var store = new InMemoryGameEventStore();
        var manager = CreateManager(store);

        await manager.StartNewGameAsync("connection-1");
        await manager.StartEmScanAsync("connection-1", 0.2, 0.4);
        await manager.StopEmScanAsync("connection-1");

        var events = await ReadAll(store);
        var scanEvent = Assert.IsType<GameStateChangedGameEvent>(events.Last().Event);
        var scanner = scanEvent.State.Game?.Ship.Scanners.EmScanner;

        Assert.NotNull(scanner);
        Assert.Null(scanner!.CurrentScan);
        Assert.Equal(3, events.Count);
    }

    [Fact]
    public async Task CaptureEmScanReportAsync_creates_report_with_anomaly_estimates()
    {
        var store = new InMemoryGameEventStore();
        var manager = CreateManager(store);

        await manager.StartNewGameAsync("connection-1");

        var newGameEvents = await ReadAll(store);
        var newGameEvent = Assert.IsType<GameStateChangedGameEvent>(newGameEvents.Last().Event);
        var anomaly = newGameEvent.State.Game!.World.JumpAreaMap.Anomalies[0];

        await manager.StartEmScanAsync("connection-1", anomaly.X, anomaly.Y);
        await manager.CaptureEmScanReportAsync(
            "connection-1",
            1 - anomaly.Distortion,
            0.25 + (anomaly.Distortion * 0.55));

        var events = await ReadAll(store);
        var reportEvent = Assert.IsType<GameStateChangedGameEvent>(events.Last().Event);
        var scanner = reportEvent.State.Game?.Ship.Scanners.EmScanner;
        var report = Assert.Single(scanner!.Reports);

        Assert.StartsWith("em-scan-", report.SourceScanId);
        Assert.Equal(anomaly.X, report.Target.X, precision: 3);
        Assert.Equal(anomaly.Y, report.Target.Y, precision: 3);
        Assert.Equal(0.1, report.RadiusLightYears, precision: 3);
        Assert.InRange(report.SignalStrength, 0, 1);
        Assert.InRange(report.Coherence, 0, 1);
        Assert.InRange(report.DriftStability, 0, 1);
        Assert.NotNull(report.EstimatedSpeedKilometersPerSecond);
        Assert.NotNull(report.EstimatedAngleDegrees);
        Assert.NotNull(report.EstimatedDistortion);
        Assert.True(report.EstimatedSpeedKilometersPerSecond > 0);
        Assert.InRange(report.EstimatedAngleDegrees!.Value, 0, 360);
        Assert.InRange(report.EstimatedDistortion!.Value, 0, 1);
        Assert.NotEqual("none", report.Confidence);
        Assert.NotEqual(EmScanLockStates.NoSignal, report.LockState);
    }

    [Fact]
    public async Task CaptureEmScanReportAsync_creates_no_signal_report_without_anomaly_lock()
    {
        var store = new InMemoryGameEventStore();
        var manager = CreateManager(store);

        await manager.StartNewGameAsync("connection-1");

        var newGameEvents = await ReadAll(store);
        var newGameEvent = Assert.IsType<GameStateChangedGameEvent>(newGameEvents.Last().Event);
        var world = newGameEvent.State.Game!.World;
        var quietPoint = FindQuietPoint(
            world.JumpAreaMap,
            newGameEvent.State.Game.Ship.Scanners.EmScanner.ScanRadiusLightYears);

        await manager.StartEmScanAsync("connection-1", quietPoint.X, quietPoint.Y);
        await manager.CaptureEmScanReportAsync("connection-1", 0.5, 0.5);

        var events = await ReadAll(store);
        var reportEvent = Assert.IsType<GameStateChangedGameEvent>(events.Last().Event);
        var scanner = reportEvent.State.Game?.Ship.Scanners.EmScanner;
        var report = Assert.Single(scanner!.Reports);

        Assert.Equal("none", report.Confidence);
        Assert.Equal(EmScanLockStates.NoSignal, report.LockState);
        Assert.Null(report.EstimatedSpeedKilometersPerSecond);
        Assert.Null(report.EstimatedAngleDegrees);
        Assert.Null(report.EstimatedDistortion);
    }

    [Fact]
    public async Task ApplyTickAsync_drains_battery_for_active_em_scan_every_ten_ticks()
    {
        var store = new InMemoryGameEventStore();
        var manager = CreateManager(store);

        await manager.StartNewGameAsync("connection-1");
        await manager.StartEmScanAsync("connection-1", 0.2, 0.4);
        await manager.ApplyTickAsync("connection-1", new GameTick(2_500, 10));

        var events = await ReadAll(store);
        var tickEvent = Assert.IsType<GameStateChangedGameEvent>(events.Last().Event);
        var activeGame = tickEvent.State.Game;

        Assert.NotNull(activeGame);
        Assert.Equal(0.739, activeGame!.Ship.BatteryBank.ChargeLevel, precision: 3);
        Assert.Equal(
            10,
            activeGame.Ship.Scanners.EmScanner.CurrentScan?.LastPowerDrainedAtTick);
    }

    [Fact]
    public async Task ApplyTickAsync_does_not_drain_battery_when_em_scan_is_inactive()
    {
        var store = new InMemoryGameEventStore();
        var manager = CreateManager(store);

        await manager.StartNewGameAsync("connection-1");
        await manager.ApplyTickAsync("connection-1", new GameTick(2_500, 10));

        var events = await ReadAll(store);

        Assert.Single(events);
    }

    [Fact]
    public async Task ApplyTickAsync_catches_up_multiple_em_scan_drain_intervals()
    {
        var store = new InMemoryGameEventStore();
        var manager = CreateManager(store);

        await manager.StartNewGameAsync("connection-1");
        await manager.StartEmScanAsync("connection-1", 0.2, 0.4);
        await manager.ApplyTickAsync("connection-1", new GameTick(7_500, 30));

        var events = await ReadAll(store);
        var tickEvent = Assert.IsType<GameStateChangedGameEvent>(events.Last().Event);
        var activeGame = tickEvent.State.Game;

        Assert.NotNull(activeGame);
        Assert.Equal(0.737, activeGame!.Ship.BatteryBank.ChargeLevel, precision: 3);
        Assert.Equal(
            30,
            activeGame.Ship.Scanners.EmScanner.CurrentScan?.LastPowerDrainedAtTick);
    }

    [Fact]
    public async Task ApplyTickAsync_stops_em_scan_when_battery_is_empty()
    {
        var store = new InMemoryGameEventStore();
        var manager = CreateManager(store);

        await manager.StartNewGameAsync("connection-1");
        await manager.StartEmScanAsync("connection-1", 0.2, 0.4);
        await manager.ApplyTickAsync("connection-1", new GameTick(2_000_000, 8_000));

        var events = await ReadAll(store);
        var tickEvent = Assert.IsType<GameStateChangedGameEvent>(events.Last().Event);
        var activeGame = tickEvent.State.Game;

        Assert.NotNull(activeGame);
        Assert.Equal(0, activeGame!.Ship.BatteryBank.ChargeLevel);
        Assert.Null(activeGame.Ship.Scanners.EmScanner.CurrentScan);
    }

    [Fact]
    public async Task StartEmScanAsync_does_not_start_when_battery_is_empty()
    {
        var store = new InMemoryGameEventStore();
        var manager = CreateManager(store);

        await manager.StartNewGameAsync("connection-1");
        await manager.StartEmScanAsync("connection-1", 0.2, 0.4);
        await manager.ApplyTickAsync("connection-1", new GameTick(2_000_000, 8_000));
        await manager.StartEmScanAsync("connection-1", 1.2, 1.4);

        var events = await ReadAll(store);

        Assert.Equal(3, events.Count);
    }

    [Fact]
    public async Task ClientGameStateProjection_hides_raw_anomaly_data()
    {
        var store = new InMemoryGameEventStore();
        var manager = CreateManager(store);

        await manager.StartNewGameAsync("connection-1");

        var envelope = await ReadSingle(store);
        var gameEvent = Assert.IsType<GameStateChangedGameEvent>(envelope.Event);
        var projectedState = ClientGameStateProjection.ForClient(gameEvent.State);

        Assert.NotEmpty(gameEvent.State.Game!.World.JumpAreaMap.Anomalies);
        Assert.Empty(projectedState.Game!.World.JumpAreaMap.Anomalies);
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

    private static (double X, double Y) FindQuietPoint(
        JumpAreaMap map,
        double radiusLightYears)
    {
        for (var xStep = 0; xStep <= 20; xStep++)
        {
            for (var yStep = 0; yStep <= 20; yStep++)
            {
                var x = xStep / 10.0;
                var y = yStep / 10.0;
                var clear = map.Anomalies.All(anomaly =>
                    DistanceBetween(x, y, anomaly.X, anomaly.Y) > radiusLightYears);

                if (clear)
                {
                    return (x, y);
                }
            }
        }

        throw new InvalidOperationException("The generated map has no quiet EM scan point.");
    }

    private static double DistanceBetween(double x1, double y1, double x2, double y2)
    {
        var deltaX = x2 - x1;
        var deltaY = y2 - y1;

        return Math.Sqrt((deltaX * deltaX) + (deltaY * deltaY));
    }

    private static async Task<GameEventEnvelope> ReadSingle(IGameEventStore store)
    {
        await foreach (var envelope in store.ReadAsync())
        {
            return envelope;
        }

        throw new InvalidOperationException("The event store did not return an event.");
    }

    private static async Task<IReadOnlyList<GameEventEnvelope>> ReadAll(IGameEventStore store)
    {
        var events = new List<GameEventEnvelope>();

        await foreach (var envelope in store.ReadAsync())
        {
            events.Add(envelope);
        }

        return events;
    }
}
