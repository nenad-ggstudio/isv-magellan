using System.Reflection;
using System.Text.Json;
using Infrastructure;

namespace Magellan.Core.Tests.Infrastructure;

public sealed class GameHubContractTests
{
    [Fact]
    public void Contract_manifest_matches_hub_commands_and_client_events()
    {
        using var document = JsonDocument.Parse(
            File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "gameHubContract.json")));
        var root = document.RootElement;
        var serverMethods = ReadValues(root.GetProperty("serverMethods"));
        var clientEvents = ReadValues(root.GetProperty("clientEvents"));

        var hubCommands = typeof(GameHub)
            .GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly)
            .Where(method => method.Name is not nameof(GameHub.OnConnectedAsync)
                and not nameof(GameHub.OnDisconnectedAsync))
            .Select(method => method.Name)
            .Order()
            .ToArray();
        var declaredClientEvents = typeof(IGameClient)
            .GetMethods()
            .Select(method => method.Name)
            .Order()
            .ToArray();

        Assert.Equal(hubCommands, serverMethods.Order());
        Assert.Equal(declaredClientEvents, clientEvents.Order());
    }

    private static IReadOnlyList<string> ReadValues(JsonElement objectElement)
    {
        return objectElement
            .EnumerateObject()
            .Select(property => property.Value.GetString())
            .OfType<string>()
            .ToArray();
    }
}
