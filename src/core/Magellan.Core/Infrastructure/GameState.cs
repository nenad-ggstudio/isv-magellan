using World;
using PlayerShip = Ship.Ship;

namespace Infrastructure;

public sealed record GameState(
    string Screen,
    IReadOnlyList<GameStateAction> Actions,
    ActiveGameState? Game)
{
    public static GameState Bootstrap(bool canLoadGame = false)
    {
        return new GameState(
            GameScreens.Bootstrap,
            CreateBootstrapActions(canLoadGame),
            null);
    }

    public static GameState NewGame(Guid gameId, DateTimeOffset startedAt)
    {
        return new GameState(
            GameScreens.Game,
            CreateGameActions(canLoadGame: false),
            new ActiveGameState(
                gameId,
                "Magellan Sector",
                startedAt,
                new GameResources(
                    new GameResource(0.04),
                    new GameResource(0.02),
                    new GameResource(0.01)),
                GameWorld.StartingWorld(startedAt),
                PlayerShip.StartingShip()));
    }

    public GameState WithSaveAvailable()
    {
        return this with
        {
            Actions = Screen == GameScreens.Game
                ? CreateGameActions(canLoadGame: true)
                : CreateBootstrapActions(canLoadGame: true)
        };
    }

    private static IReadOnlyList<GameStateAction> CreateBootstrapActions(bool canLoadGame)
    {
        var actions = new List<GameStateAction>
        {
            new(GameActions.StartNewGame, "New Game")
        };

        if (canLoadGame)
        {
            actions.Add(new GameStateAction(GameActions.LoadGame, "Load Game"));
        }

        return actions;
    }

    private static IReadOnlyList<GameStateAction> CreateGameActions(bool canLoadGame)
    {
        var actions = new List<GameStateAction>
        {
            new(GameActions.StartNewGame, "New Game"),
            new(GameActions.SaveGame, "Save Game")
        };

        if (canLoadGame)
        {
            actions.Add(new GameStateAction(GameActions.LoadGame, "Load Game"));
        }

        return actions;
    }
}

public sealed record GameStateAction(string Id, string Label);

public sealed record ActiveGameState(
    Guid Id,
    string Name,
    DateTimeOffset StartedAt,
    GameResources Resources,
    GameWorld World,
    PlayerShip Ship);

public sealed record GameResources(
    GameResource Water,
    GameResource Lithium,
    GameResource Carbon);

public sealed record GameResource(double ContaminationLevel);

public static class GameScreens
{
    public const string Bootstrap = "bootstrap";
    public const string Game = "game";
}

public static class GameActions
{
    public const string StartNewGame = "startNewGame";
    public const string SaveGame = "saveGame";
    public const string LoadGame = "loadGame";
}
