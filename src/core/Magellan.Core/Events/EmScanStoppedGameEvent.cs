using Infrastructure;

namespace Events;

public sealed record EmScanStoppedGameEvent(Guid GameId) : GameEvent(GameId);
