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
    private static readonly Guid TestGameId =
        Guid.Parse("9a7472e9-ec4b-4183-b1c7-2df71162e03a");

    [Fact]
    public async Task AppendAsync_does_not_write_tick_events_by_default()
    {
        using var workspace = TestWorkspace.Create();

        using (var store = CreateStore(workspace))
        {
            await store.AppendAsync(
                new TickGameEvent(TestGameId, new GameTick(250, 7)));
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
                new TickGameEvent(TestGameId, new GameTick(250, 7)));
        }

        Assert.False(File.Exists(workspace.GameEventsPath));

        var tickLine = Assert.Single(File.ReadAllLines(workspace.TickEventsPath));
        var columns = tickLine.Split('\t');

        Assert.Equal("1", columns[0]);
        Assert.Equal(TestGameId.ToString(), columns[2]);
        Assert.Equal("250", columns[3]);
        Assert.Equal("7", columns[4]);
    }

    [Fact]
    public async Task AppendAsync_writes_non_tick_events_to_diagnostic_json_lines()
    {
        using var workspace = TestWorkspace.Create();

        using (var store = CreateStore(workspace))
        {
            await store.AppendAsync(new TestGameEvent(TestGameId, "started"));
        }

        Assert.False(File.Exists(workspace.TickEventsPath));

        var line = Assert.Single(File.ReadAllLines(workspace.GameEventsPath));
        using var document = JsonDocument.Parse(line);
        var persistedEvent = document.RootElement;

        Assert.Equal(1, persistedEvent.GetProperty("sequence").GetInt64());
        Assert.Equal(typeof(TestGameEvent).FullName, persistedEvent.GetProperty("type").GetString());
        Assert.Equal(TestGameId, persistedEvent.GetProperty("gameId").GetGuid());
        Assert.Equal("started", persistedEvent.GetProperty("payload").GetProperty("name").GetString());

        using var reloadedStore = CreateStore(workspace);
        var replayedEvents = await ReadAll(reloadedStore);
        var nextEvent = await reloadedStore.AppendAsync(
            new TestGameEvent(TestGameId, "continued"));

        Assert.Empty(replayedEvents);
        Assert.Equal(2, nextEvent.Sequence);
    }

    [Fact]
    public async Task AppendAsync_does_not_persist_non_persisted_events()
    {
        using var workspace = TestWorkspace.Create();

        using (var store = CreateStore(workspace))
        {
            await store.AppendAsync(
                new ClientGameStateChangedGameEvent(
                    "connection-1",
                    GameState.Bootstrap()));

            var replayed = await ReadSingle(store);

            Assert.IsType<ClientGameStateChangedGameEvent>(replayed.Event);
        }

        Assert.False(File.Exists(workspace.GameEventsPath));

        using var reloadedStore = CreateStore(workspace);
        var replayedEvents = await ReadAll(reloadedStore);

        Assert.Empty(replayedEvents);
    }

    [Fact]
    public async Task AppendAsync_logs_game_state_payload_without_rehydrating_it()
    {
        using var workspace = TestWorkspace.Create();
        var state = GameState.NewGame(TestGameId, DateTimeOffset.UtcNow);

        using (var store = CreateStore(workspace))
        {
            await store.AppendAsync(new GameStateChangedGameEvent(TestGameId, state));
        }

        var line = Assert.Single(File.ReadAllLines(workspace.GameEventsPath));
        using var document = JsonDocument.Parse(line);
        var loggedState = document.RootElement
            .GetProperty("payload")
            .GetProperty("state");

        Assert.Equal(GameScreens.Game, loggedState.GetProperty("screen").GetString());
        Assert.Equal(
            TestGameId,
            loggedState.GetProperty("game").GetProperty("id").GetGuid());

        using var reloadedStore = CreateStore(workspace);

        Assert.Empty(await ReadAll(reloadedStore));
    }

    [Fact]
    public async Task ReadAsync_keeps_only_the_configured_in_process_replay_window()
    {
        using var workspace = TestWorkspace.Create();
        using var store = CreateStore(workspace, replayBufferCapacity: 2);

        await store.AppendAsync(new TestGameEvent(TestGameId, "first"));
        await store.AppendAsync(new TestGameEvent(TestGameId, "second"));
        await store.AppendAsync(new TestGameEvent(TestGameId, "third"));

        var replayedEvents = await ReadAll(store);

        Assert.Equal([2L, 3L], replayedEvents.Select(gameEvent => gameEvent.Sequence));
        Assert.Equal(
            ["second", "third"],
            replayedEvents.Select(gameEvent => Assert.IsType<TestGameEvent>(gameEvent.Event).Name));
    }

    [Fact]
    public async Task AppendAsync_continues_after_a_partial_diagnostic_log_line()
    {
        using var workspace = TestWorkspace.Create();

        using (var store = CreateStore(workspace))
        {
            await store.AppendAsync(new TestGameEvent(TestGameId, "first"));
        }

        await File.AppendAllTextAsync(workspace.GameEventsPath, "{\"partial\":");

        using (var store = CreateStore(workspace))
        {
            var nextEvent = await store.AppendAsync(
                new TestGameEvent(TestGameId, "second"));

            Assert.Equal(2, nextEvent.Sequence);
        }

        Assert.Equal(3, File.ReadAllLines(workspace.GameEventsPath).Length);
    }

    [Fact]
    public async Task AppendAsync_continues_sequence_after_existing_tick_log()
    {
        using var workspace = TestWorkspace.Create();

        using (var store = CreateStore(workspace, logTickEvents: true))
        {
            await store.AppendAsync(
                new TickGameEvent(TestGameId, new GameTick(250, 1)));
        }

        using var reloadedStore = CreateStore(workspace);
        var gameEvent = await reloadedStore.AppendAsync(
            new TestGameEvent(TestGameId, "started"));

        Assert.Equal(2, gameEvent.Sequence);
    }

    private static FileGameEventStore CreateStore(
        TestWorkspace workspace,
        bool logTickEvents = false,
        int replayBufferCapacity = 10_000)
    {
        return new FileGameEventStore(
            workspace.Environment,
            Options.Create(
                new GameEventStoreOptions
                {
                    LogTickEvents = logTickEvents,
                    ReplayBufferCapacity = replayBufferCapacity
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

    private static async Task<IReadOnlyList<GameEventEnvelope>> ReadAll(IGameEventStore store)
    {
        var events = new List<GameEventEnvelope>();

        await foreach (var envelope in store.ReadAsync())
        {
            events.Add(envelope);
        }

        return events;
    }

    public sealed record TestGameEvent(Guid GameId, string Name) : GameEvent(GameId);

    private sealed class TestWorkspace : IDisposable
    {
        private TestWorkspace(string rootPath)
        {
            RootPath = rootPath;
            Environment = new TestWebHostEnvironment(rootPath);
        }

        public string RootPath { get; }

        public IWebHostEnvironment Environment { get; }

        public string GameEventsPath => Path.Combine(RootPath, "App_Data", "game-events.jsonl");

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
