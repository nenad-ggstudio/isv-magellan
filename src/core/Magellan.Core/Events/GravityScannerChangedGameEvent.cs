using Infrastructure;
using Ship.Scanners;

namespace Events;

public sealed record GravityScannerChangedGameEvent(
    Guid GameId,
    GravityScanner GravityScanner) : GameEvent(GameId);
