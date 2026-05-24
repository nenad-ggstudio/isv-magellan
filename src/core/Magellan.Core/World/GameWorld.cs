namespace World;

public sealed record GameWorld(
    WorldPosition ShipPosition,
    DateTimeOffset CurrentTime,
    SensorScan LongRangeScan,
    SensorScan LocalSectorScan)
{
    private const double SecondsPerLightYear = 31_557_600;
    private const double LightSpeedKilometersPerSecond = 299_792.458;

    public static GameWorld StartingWorld(DateTimeOffset currentTime)
    {
        return new GameWorld(
            new WorldPosition("Ship Origin", 0, 0, DistanceUnits.Kilometer),
            currentTime,
            new SensorScan(
                "long-range",
                "Long Range Sensors",
                4,
                DistanceUnits.LightYear,
                [
                    LongRangeContact(
                        "lr-morrow-star",
                        "Morrow Star",
                        SensorContactKinds.Star,
                        1.12,
                        -0.42,
                        "K-type main sequence star",
                        1.5),
                    LongRangeContact(
                        "lr-vela-minor",
                        "Vela Minor",
                        SensorContactKinds.Planetoid,
                        -0.86,
                        1.92,
                        "cold planetoid",
                        1.1),
                    LongRangeContact(
                        "lr-nacre-cloud",
                        "Nacre Cloud",
                        SensorContactKinds.Nebula,
                        2.54,
                        1.36,
                        "diffuse ionized gas",
                        1.35),
                    LongRangeContact(
                        "lr-kepler-fragment",
                        "Kepler Fragment",
                        SensorContactKinds.LargeAsteroid,
                        0.44,
                        3.18,
                        "large metallic asteroid",
                        0.82),
                    LongRangeContact(
                        "lr-sable-comet",
                        "Sable Comet",
                        SensorContactKinds.Comet,
                        -2.72,
                        -1.18,
                        "active long-period comet",
                        0.72)
                ]),
            new SensorScan(
                "local-sector",
                "Local Sector Sensors",
                8_000,
                DistanceUnits.Kilometer,
                [
                    LocalContact(
                        "local-kite-rock",
                        "Kite Rock",
                        SensorContactKinds.Asteroid,
                        1_180,
                        -940,
                        "tumbling carbonaceous rock",
                        0.72),
                    LocalContact(
                        "local-ice-shard",
                        "Ice Shard",
                        SensorContactKinds.Asteroid,
                        5_240,
                        690,
                        "volatile-rich fragment",
                        0.48),
                    LocalContact(
                        "local-dust-lane",
                        "Dust Lane",
                        SensorContactKinds.Debris,
                        -3_620,
                        2_180,
                        "loose particulate field",
                        0.92),
                    LocalContact(
                        "local-silent-probe",
                        "Silent Probe",
                        SensorContactKinds.Debris,
                        820,
                        4_360,
                        "inactive manufactured object",
                        0.56)
                ]));
    }

    private static SensorContact LongRangeContact(
        string id,
        string name,
        string kind,
        double x,
        double y,
        string classification,
        double markerScale)
    {
        var distance = DistanceFromOrigin(x, y);

        return new SensorContact(
            id,
            name,
            kind,
            x,
            y,
            distance,
            distance * SecondsPerLightYear,
            classification,
            markerScale);
    }

    private static SensorContact LocalContact(
        string id,
        string name,
        string kind,
        double x,
        double y,
        string classification,
        double markerScale)
    {
        var distance = DistanceFromOrigin(x, y);

        return new SensorContact(
            id,
            name,
            kind,
            x,
            y,
            distance,
            distance / LightSpeedKilometersPerSecond,
            classification,
            markerScale);
    }

    private static double DistanceFromOrigin(double x, double y)
    {
        return Math.Sqrt((x * x) + (y * y));
    }
}
