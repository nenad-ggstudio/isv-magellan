using Infrastructure;

namespace Events;

public sealed record ClientGameStateChangedGameEvent(string ConnectionId, GameState State)
    : GameEvent(Guid.Empty);
