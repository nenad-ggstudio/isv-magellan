using Infrastructure;

namespace Events;

public sealed record GameStartedGameEvent(Guid GameId, DateTimeOffset StartedAt)
    : GameEvent(GameId);
