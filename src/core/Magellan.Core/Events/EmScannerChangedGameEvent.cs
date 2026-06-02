using Infrastructure;
using Ship.Scanners;

namespace Events;

public sealed record EmScannerChangedGameEvent(Guid GameId, EmScanner EmScanner)
    : GameEvent(GameId);
