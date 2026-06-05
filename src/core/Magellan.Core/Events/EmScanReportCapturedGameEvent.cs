using Infrastructure;

namespace Events;

public sealed record EmScanReportCapturedGameEvent(
    Guid GameId,
    long CapturedAtTick,
    double Focus,
    double Filter,
    double PhaseErrorRadians) : GameEvent(GameId);
