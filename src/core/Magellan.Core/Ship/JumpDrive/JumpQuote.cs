namespace Ship.JumpDrive;

public sealed record JumpQuote(
    double OriginX,
    double OriginY,
    double TargetX,
    double TargetY,
    double DistanceLightYears,
    double DeuteriumCostKilograms,
    double TritiumCostKilograms,
    bool CanAfford);
