using Infrastructure;

namespace Events;

public sealed record GravityScanStartedGameEvent(Guid GameId, long StartedAtTick)
    : GameEvent(GameId);
