using Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using System.Text.Json;

namespace Magellan.Core.Tests.Infrastructure;

public sealed class FileGameSaveStoreTests
{
    [Fact]
    public async Task SaveAsync_round_trips_complete_game_state()
    {
        using var workspace = TestWorkspace.Create();
        var gameId = Guid.NewGuid();
        var state = GameState.NewGame(gameId, DateTimeOffset.UtcNow).WithSaveAvailable();
        var expected = new GameSave(
            GameSave.CurrentFormatVersion,
            DateTimeOffset.UtcNow,
            new GameTick(12_500, 50),
            state);
        var store = new FileGameSaveStore(workspace.Environment);

        await store.SaveAsync(expected);
        var actual = await new FileGameSaveStore(workspace.Environment).LoadAsync();

        Assert.NotNull(actual);
        Assert.Equal(expected.FormatVersion, actual!.FormatVersion);
        Assert.Equal(expected.SavedAt, actual.SavedAt);
        Assert.Equal(expected.Tick, actual.Tick);
        Assert.True(
            JsonElement.DeepEquals(
                JsonSerializer.SerializeToElement(expected.State),
                JsonSerializer.SerializeToElement(actual.State)),
            "The deserialized game state should contain the complete saved snapshot.");
        Assert.Equal(gameId, actual.State.Game!.Id);
        Assert.NotEmpty(actual.State.Game.World.JumpAreaMap.Anomalies);
        Assert.True(await store.ExistsAsync());
    }

    [Fact]
    public async Task SaveAsync_replaces_the_manual_slot_without_leaving_temporary_file()
    {
        using var workspace = TestWorkspace.Create();
        var store = new FileGameSaveStore(workspace.Environment);
        var firstState = GameState.NewGame(Guid.NewGuid(), DateTimeOffset.UtcNow);
        var secondState = GameState.NewGame(Guid.NewGuid(), DateTimeOffset.UtcNow);

        await store.SaveAsync(CreateSave(firstState));
        await store.SaveAsync(CreateSave(secondState));

        var loaded = await store.LoadAsync();
        Assert.Equal(secondState.Game!.Id, loaded!.State.Game!.Id);
        Assert.False(File.Exists(workspace.SavePath + ".tmp"));
    }

    private static GameSave CreateSave(GameState state)
    {
        return new GameSave(
            GameSave.CurrentFormatVersion,
            DateTimeOffset.UtcNow,
            new GameTick(0, 0),
            state);
    }

    private sealed class TestWorkspace : IDisposable
    {
        private TestWorkspace(string rootPath)
        {
            RootPath = rootPath;
            Environment = new TestWebHostEnvironment(rootPath);
        }

        public string RootPath { get; }

        public IWebHostEnvironment Environment { get; }

        public string SavePath =>
            Path.Combine(RootPath, "App_Data", "Saves", "manual-save.json");

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
