using World;
using PlayerShip = Ship.Ship;

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
                    new GameResource(0.04),
                    new GameResource(0.02),
                    new GameResource(0.01)),
                GameWorld.StartingWorld(startedAt),
                PlayerShip.StartingShip()));
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
}
