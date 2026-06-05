using Infrastructure;

namespace Events;

public sealed record EmScanPowerDrainedGameEvent(
    Guid GameId,
    long Tick,
    long DrainIntervals,
    double ChargeLevelCost,
    long LastPowerDrainedAtTick,
    bool ScanStopped) : GameEvent(GameId);
