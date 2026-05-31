using Infrastructure;

namespace Events;

public sealed record TickGameEvent(Guid GameId, GameTick Tick) : GameEvent(GameId);
