namespace World;

public sealed record LocalMapContact(
    string Id,
    string Name,
    string Kind,
    string AsteroidTypeId,
    string AsteroidTypeLabel,
    double X,
    double Y,
    double Distance,
    double SignalAgeSeconds,
    double SpeedKilometersPerSecond,
    double DirectionDegrees,
    IReadOnlyList<ResourceEstimate> ResourceEstimates);
