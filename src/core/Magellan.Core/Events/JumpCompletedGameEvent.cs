using Infrastructure;

namespace Events;

public sealed record JumpCompletedGameEvent(
    Guid GameId,
    DateTimeOffset JumpedAt,
    double DestinationX,
    double DestinationY,
    double DistanceLightYears,
    double DeuteriumCostKilograms,
    double TritiumCostKilograms) : GameEvent(GameId);
