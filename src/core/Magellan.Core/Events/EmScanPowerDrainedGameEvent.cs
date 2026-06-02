using Infrastructure;
using Ship.BatteryBank;
using Ship.Scanners;

namespace Events;

public sealed record EmScanPowerDrainedGameEvent(
    Guid GameId,
    BatteryBank BatteryBank,
    EmScanner EmScanner) : GameEvent(GameId);
