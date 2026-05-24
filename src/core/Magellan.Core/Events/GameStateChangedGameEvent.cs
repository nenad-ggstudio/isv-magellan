using Infrastructure;

namespace Events;

public sealed record GameStateChangedGameEvent(string ConnectionId, GameState State)
    : GameEvent(ConnectionId);
