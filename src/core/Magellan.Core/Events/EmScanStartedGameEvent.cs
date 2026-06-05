using Infrastructure;

namespace Events;

public sealed record EmScanStartedGameEvent(
    Guid GameId,
    long StartedAtTick,
    double TargetX,
    double TargetY) : GameEvent(GameId);
