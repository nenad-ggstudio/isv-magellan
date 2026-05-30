namespace Infrastructure;

public static class ClientGameStateProjection
{
    public static GameState ForClient(GameState state)
    {
        if (state.Game is null)
        {
            return state;
        }

        var game = state.Game;
        var world = game.World;

        return state with
        {
            Game = game with
            {
                World = world with
                {
                    JumpAreaMap = world.JumpAreaMap with
                    {
                        Anomalies = []
                    }
                }
            }
        };
    }
}
