using World;

namespace Infrastructure;

public sealed record GameState(
    string Screen,
    IReadOnlyList<GameStateAction> Actions,
    ActiveGameState? Game)
{
    public static GameState Bootstrap()
    {
        return new GameState(
            GameScreens.Bootstrap,
            [new GameStateAction(GameActions.StartNewGame, "New Game")],
            null);
    }

    public static GameState NewGame(Guid gameId, DateTimeOffset startedAt)
    {
        return new GameState(
            GameScreens.Game,
            [],
            new ActiveGameState(
                gameId,
                "Magellan Sector",
                startedAt,
                new GameResources(
                    Water: 148,
                    Iron: 62,
                    Power: 91),
                GameWorld.StartingWorld(startedAt)));
    }
}

public sealed record GameStateAction(string Id, string Label);

public sealed record ActiveGameState(
    Guid Id,
    string Name,
    DateTimeOffset StartedAt,
    GameResources Resources,
    GameWorld World);

public sealed record GameResources(int Water, int Iron, int Power);

public static class GameScreens
{
    public const string Bootstrap = "bootstrap";
    public const string Game = "game";
}

public static class GameActions
{
    public const string StartNewGame = "startNewGame";
}
