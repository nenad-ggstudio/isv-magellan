using System.Text.Json;
using Events;
using Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace Magellan.Core.Tests.Infrastructure;

public sealed class FileGameEventStoreTests
{
    [Fact]
    public async Task AppendAsync_writes_tick_events_to_minimal_tick_file_only()
    {
        using var workspace = TestWorkspace.Create();

        using (var store = new FileGameEventStore(workspace.Environment))
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

        using (var store = new FileGameEventStore(workspace.Environment))
        {
            await store.AppendAsync(new TestGameEvent("connection-1", "started"));
        }

        Assert.Empty(File.ReadAllLines(workspace.TickEventsPath));

        using var document = JsonDocument.Parse(File.ReadAllText(workspace.GameEventsPath));
        var persistedEvent = Assert.Single(document.RootElement.EnumerateArray());

        Assert.Equal(typeof(TestGameEvent).FullName, persistedEvent.GetProperty("type").GetString());
        Assert.Equal("connection-1", persistedEvent.GetProperty("connectionId").GetString());

        using var reloadedStore = new FileGameEventStore(workspace.Environment);
        var replayed = await ReadSingle(reloadedStore);
        var replayedEvent = Assert.IsType<TestGameEvent>(replayed.Event);

        Assert.Equal("connection-1", replayedEvent.ConnectionId);
        Assert.Equal("started", replayedEvent.Name);
    }

    [Fact]
    public async Task AppendAsync_continues_sequence_after_existing_tick_log()
    {
        using var workspace = TestWorkspace.Create();

        using (var store = new FileGameEventStore(workspace.Environment))
        {
            await store.AppendAsync(
                new TickGameEvent("connection-1", new GameTick(250, 1)));
        }

        using var reloadedStore = new FileGameEventStore(workspace.Environment);
        var gameEvent = await reloadedStore.AppendAsync(
            new TestGameEvent("connection-1", "started"));

        Assert.Equal(2, gameEvent.Sequence);
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
