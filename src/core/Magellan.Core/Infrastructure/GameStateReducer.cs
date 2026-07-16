using Events;
using Ship.Scanners;

namespace Infrastructure;

public static class GameStateReducer
{
    public static GameState Apply(GameState? state, GameEvent gameEvent)
    {
        return gameEvent switch
        {
            GameStartedGameEvent gameStarted =>
                GameState.NewGame(gameStarted.GameId, gameStarted.StartedAt),
            GameStateChangedGameEvent stateChanged =>
                stateChanged.State,
            GravityScanStartedGameEvent gravityScanStarted =>
                ApplyToActiveGame(
                    state,
                    game => game with
                    {
                        Ship = game.Ship.WithScanners(
                            game.Ship.Scanners with
                            {
                                GravityScanner =
                                    game.Ship.Scanners.GravityScanner.StartScan(
                                        gravityScanStarted.StartedAtTick,
                                        game.World.JumpAreaMap)
                            })
                    }),
            EmScanStartedGameEvent emScanStarted =>
                ApplyToActiveGame(
                    state,
                    game => game with
                    {
                        Ship = game.Ship.WithScanners(
                            game.Ship.Scanners with
                            {
                                EmScanner = game.Ship.Scanners.EmScanner.StartScan(
                                    emScanStarted.StartedAtTick,
                                    emScanStarted.TargetX,
                                    emScanStarted.TargetY,
                                    game.World.JumpAreaMap)
                            })
                    }),
            EmScanReportCapturedGameEvent reportCaptured =>
                ApplyToActiveGame(
                    state,
                    game => game with
                    {
                        Ship = game.Ship.WithScanners(
                            game.Ship.Scanners with
                            {
                                EmScanner = game.Ship.Scanners.EmScanner.CaptureReport(
                                    reportCaptured.CapturedAtTick,
                                    game.World.JumpAreaMap,
                                    reportCaptured.Focus,
                                    reportCaptured.Filter,
                                    reportCaptured.PhaseErrorRadians)
                            })
                    }),
            EmScanStoppedGameEvent =>
                ApplyToActiveGame(
                    state,
                    game => game with
                    {
                        Ship = game.Ship.WithScanners(
                            game.Ship.Scanners with
                            {
                                EmScanner = game.Ship.Scanners.EmScanner.StopScan()
                            })
                    }),
            EmScanPowerDrainedGameEvent powerDrained =>
                ApplyToActiveGame(
                    state,
                    game => ApplyEmScanPowerDrained(game, powerDrained)),
            JumpCompletedGameEvent jumpCompleted =>
                ApplyToActiveGame(
                    state,
                    game => ApplyJumpCompleted(game, jumpCompleted)),
            _ => state ?? GameState.Bootstrap()
        };
    }

    private static ActiveGameState ApplyJumpCompleted(
        ActiveGameState game,
        JumpCompletedGameEvent jumpCompleted)
    {
        return game with
        {
            World = game.World.JumpTo(
                jumpCompleted.DestinationX,
                jumpCompleted.DestinationY,
                jumpCompleted.JumpedAt),
            Ship = game.Ship
                .WithFusionCore(
                    game.Ship.FusionCore.SpendJumpFuel(
                        jumpCompleted.DeuteriumCostKilograms,
                        jumpCompleted.TritiumCostKilograms))
                .WithScanners(ShipScanners.StartingScanners())
        };
    }

    private static ActiveGameState ApplyEmScanPowerDrained(
        ActiveGameState game,
        EmScanPowerDrainedGameEvent powerDrained)
    {
        var scanner = game.Ship.Scanners.EmScanner;
        var nextBattery = game.Ship.BatteryBank.DrainChargeLevel(
            powerDrained.ChargeLevelCost);
        var nextScanner = powerDrained.ScanStopped
            ? scanner.StopScan()
            : scanner.WithPowerDrainCheckpoint(powerDrained.LastPowerDrainedAtTick);

        return game with
        {
            Ship = game.Ship
                .WithBatteryBank(nextBattery)
                .WithScanners(
                    game.Ship.Scanners with
                    {
                        EmScanner = nextScanner
                    })
        };
    }

    private static GameState ApplyToActiveGame(
        GameState? state,
        Func<ActiveGameState, ActiveGameState> update)
    {
        if (state?.Game is null)
        {
            throw new InvalidOperationException(
                "Cannot apply an active game event before the game has started.");
        }

        return state with
        {
            Game = update(state.Game)
        };
    }
}
