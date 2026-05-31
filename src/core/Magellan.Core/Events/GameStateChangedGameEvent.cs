using Infrastructure;

namespace Events;

public sealed record GameStateChangedGameEvent(Guid GameId, GameState State)
    : GameEvent(GameId);
