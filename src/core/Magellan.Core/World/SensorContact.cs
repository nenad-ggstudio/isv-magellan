namespace World;

public sealed record SensorContact(
    string Id,
    string Name,
    string Kind,
    string AsteroidTypeId,
    string AsteroidTypeLabel,
    double X,
    double Y,
    double Distance,
    double SignalAgeSeconds,
    double MarkerScale,
    IReadOnlyList<ResourceEstimate> ResourceEstimates);
