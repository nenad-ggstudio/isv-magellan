namespace World;

public sealed record LongRangeMap(
    string Id,
    string Label,
    double Width,
    double Height,
    string DistanceUnit,
    IReadOnlyList<StellarSystem> Systems);

public sealed record StellarSystem(
    string Id,
    string Name,
    string Role,
    string StarType,
    double StarSizeSolarRadii,
    double X,
    double Y,
    double Distance,
    int PlanetCountPrediction,
    double PlanetCountAccuracy,
    IReadOnlyList<ResourceDetection> ResourceDetections);

public sealed record ResourceDetection(
    string Resource,
    bool Detected,
    double Confidence);
