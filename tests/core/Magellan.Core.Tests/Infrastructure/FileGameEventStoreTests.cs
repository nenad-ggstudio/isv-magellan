using System.Text.Json;
using Events;
using Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace Magellan.Core.Tests.Infrastructure;

public sealed class FileGameEventStoreTests
{
    [Fact]
    public async Task AppendAsync_does_not_write_tick_events_by_default()
    {
        using var workspace = TestWorkspace.Create();

        using (var store = CreateStore(workspace))
        {
            await store.AppendAsync(
                new TickGameEvent("connection-1", new GameTick(250, 7)));
        }

        Assert.False(File.Exists(workspace.GameEventsPath));
        Assert.False(File.Exists(workspace.TickEventsPath));
    }

    [Fact]
    public async Task AppendAsync_writes_tick_events_to_minimal_tick_file_when_enabled()
    {
        using var workspace = TestWorkspace.Create();

        using (var store = CreateStore(workspace, logTickEvents: true))
        {
            await store.AppendAsync(
                new TickGameEvent("connection-1", new GameTick(250, 7)));
        }

        Assert.False(File.Exists(workspace.GameEventsPath));

        var tickLine = Assert.Single(File.ReadAllLines(workspace.TickEventsPath));
        var columns = tickLine.Split('\t');

        Assert.Equal("1", columns[0]);
        Assert.Equal("connection-1", columns[2]);
        Assert.Equal("250", columns[3]);
        Assert.Equal("7", columns[4]);
    }

    [Fact]
    public async Task AppendAsync_writes_non_tick_events_to_game_events_json()
    {
        using var workspace = TestWorkspace.Create();

        using (var store = CreateStore(workspace))
        {
            await store.AppendAsync(new TestGameEvent("connection-1", "started"));
        }

        Assert.False(File.Exists(workspace.TickEventsPath));

        using var document = JsonDocument.Parse(File.ReadAllText(workspace.GameEventsPath));
        var persistedEvent = Assert.Single(document.RootElement.EnumerateArray());

        Assert.Equal(typeof(TestGameEvent).FullName, persistedEvent.GetProperty("type").GetString());
        Assert.Equal("connection-1", persistedEvent.GetProperty("connectionId").GetString());

        using var reloadedStore = CreateStore(workspace);
        var replayed = await ReadSingle(reloadedStore);
        var replayedEvent = Assert.IsType<TestGameEvent>(replayed.Event);

        Assert.Equal("connection-1", replayedEvent.ConnectionId);
        Assert.Equal("started", replayedEvent.Name);
    }

    [Fact]
    public async Task AppendAsync_rehydrates_game_state_changed_events()
    {
        using var workspace = TestWorkspace.Create();
        var state = GameState.NewGame(Guid.NewGuid(), DateTimeOffset.UtcNow);

        using (var store = CreateStore(workspace))
        {
            await store.AppendAsync(new GameStateChangedGameEvent("connection-1", state));
        }

        using var reloadedStore = CreateStore(workspace);
        var replayed = await ReadSingle(reloadedStore);
        var replayedEvent = Assert.IsType<GameStateChangedGameEvent>(replayed.Event);

        Assert.Equal("connection-1", replayedEvent.ConnectionId);
        Assert.Equal(GameScreens.Game, replayedEvent.State.Screen);

        var expectedGame = Assert.IsType<ActiveGameState>(state.Game);
        var actualGame = Assert.IsType<ActiveGameState>(replayedEvent.State.Game);

        Assert.Equal(expectedGame.Id, actualGame.Id);
        Assert.Equal(expectedGame.Name, actualGame.Name);
        Assert.Equal(expectedGame.StartedAt, actualGame.StartedAt);
        Assert.Equal(expectedGame.Resources, actualGame.Resources);
        Assert.Equal(expectedGame.Ship.Name, actualGame.Ship.Name);
        Assert.Equal(
            expectedGame.Ship.StorageUnits.Select(unit => unit.SlotNumber),
            actualGame.Ship.StorageUnits.Select(unit => unit.SlotNumber));
        Assert.Equal(
            expectedGame.Ship.StorageUnits.Select(unit => unit.Contents?.Resource),
            actualGame.Ship.StorageUnits.Select(unit => unit.Contents?.Resource));
        Assert.Equal(
            expectedGame.Ship.FusionCore.DeuteriumReservoir.QuantityKilograms,
            actualGame.Ship.FusionCore.DeuteriumReservoir.QuantityKilograms);
        Assert.Equal(
            expectedGame.Ship.FusionCore.TritiumReservoir.PurityLevel,
            actualGame.Ship.FusionCore.TritiumReservoir.PurityLevel);
        Assert.Equal(
            expectedGame.Ship.FusionCore.CoolantTank.CapacityKilograms,
            actualGame.Ship.FusionCore.CoolantTank.CapacityKilograms);
        Assert.Equal(
            expectedGame.Ship.BatteryBank.DesignCapacityKilowattHours,
            actualGame.Ship.BatteryBank.DesignCapacityKilowattHours);
        Assert.Equal(
            expectedGame.Ship.BatteryBank.MaxCapacityKilowattHours,
            actualGame.Ship.BatteryBank.MaxCapacityKilowattHours);
        Assert.Equal(
            expectedGame.Ship.BatteryBank.ChargeLevel,
            actualGame.Ship.BatteryBank.ChargeLevel);
        Assert.Equal(expectedGame.World.ShipPosition, actualGame.World.ShipPosition);
        Assert.Equal(
            expectedGame.World.LongRangeScan.Contacts.Select(contact => contact.Id),
            actualGame.World.LongRangeScan.Contacts.Select(contact => contact.Id));
        Assert.Equal(
            expectedGame.World.LocalSectorScan.Contacts.Select(contact => contact.Id),
            actualGame.World.LocalSectorScan.Contacts.Select(contact => contact.Id));
    }

    [Fact]
    public async Task AppendAsync_continues_sequence_after_existing_tick_log()
    {
        using var workspace = TestWorkspace.Create();

        using (var store = CreateStore(workspace, logTickEvents: true))
        {
            await store.AppendAsync(
                new TickGameEvent("connection-1", new GameTick(250, 1)));
        }

        using var reloadedStore = CreateStore(workspace);
        var gameEvent = await reloadedStore.AppendAsync(
            new TestGameEvent("connection-1", "started"));

        Assert.Equal(2, gameEvent.Sequence);
    }

    private static FileGameEventStore CreateStore(
        TestWorkspace workspace,
        bool logTickEvents = false)
    {
        return new FileGameEventStore(
            workspace.Environment,
            Options.Create(
                new GameEventStoreOptions
                {
                    LogTickEvents = logTickEvents
                }));
    }

    private static async Task<GameEventEnvelope> ReadSingle(IGameEventStore store)
    {
        await foreach (var envelope in store.ReadAsync())
        {
            return envelope;
        }

        throw new InvalidOperationException("The event store did not return an event.");
    }

    public sealed record TestGameEvent(string ConnectionId, string Name) : GameEvent(ConnectionId);

    private sealed class TestWorkspace : IDisposable
    {
        private TestWorkspace(string rootPath)
        {
            RootPath = rootPath;
            Environment = new TestWebHostEnvironment(rootPath);
        }

        public string RootPath { get; }

        public IWebHostEnvironment Environment { get; }

        public string GameEventsPath => Path.Combine(RootPath, "App_Data", "game-events.json");

        public string TickEventsPath => Path.Combine(RootPath, "App_Data", "tick-game-events.tsv");

        public static TestWorkspace Create()
        {
            var rootPath = Path.Combine(
                Path.GetTempPath(),
                "Magellan.Core.Tests",
                Guid.NewGuid().ToString("N"));

            Directory.CreateDirectory(rootPath);
            return new TestWorkspace(rootPath);
        }

        public void Dispose()
        {
            if (Directory.Exists(RootPath))
            {
                Directory.Delete(RootPath, recursive: true);
            }
        }
    }

    private sealed class TestWebHostEnvironment(string contentRootPath) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "Magellan.Core.Tests";

        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();

        public string ContentRootPath { get; set; } = contentRootPath;

        public string EnvironmentName { get; set; } = Environments.Development;

        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();

        public string WebRootPath { get; set; } = contentRootPath;
    }
}
