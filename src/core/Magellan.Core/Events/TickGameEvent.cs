using Infrastructure;

namespace Events;

public sealed record TickGameEvent(string ConnectionId, GameTick Tick) : GameEvent(ConnectionId);
