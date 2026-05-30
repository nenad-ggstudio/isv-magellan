namespace World;

public sealed record JumpAreaMap(
    string Id,
    string Label,
    double Width,
    double Height,
    string DistanceUnit,
    IReadOnlyList<StellarSystem> Systems,
    IReadOnlyList<SensorAnomaly> Anomalies
);

public sealed record SensorAnomaly(
    string Id,
    string Kind,
    string Label,
    double X,
    double Y,
    double Distance,
    double Speed,
    double Angle,
    double Distortion
);

public static class SensorAnomalyKinds
{
    public const string RoguePlanet = "rogue-planet";
    public const string AsteroidCluster = "asteroid-cluster";
    public const string Comet = "comet";
    public const string EnergyParticleWells = "energy-particle-wells";
}
