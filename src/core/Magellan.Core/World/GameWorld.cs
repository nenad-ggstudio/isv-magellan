using World.SpaceObjects.Asteroids;

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
                    LongRangeContact(new Asteroid(
                        "lr-morrow-star",
                        "Morrow Star",
                        1.12,
                        -0.42,
                        DistanceUnits.LightYear,
                        1.08,
                        AsteroidTypes.CType)),
                    LongRangeContact(new Asteroid(
                        "lr-vela-minor",
                        "Vela Minor",
                        -0.86,
                        1.92,
                        DistanceUnits.LightYear,
                        0.92,
                        AsteroidTypes.SType)),
                    LongRangeContact(new Asteroid(
                        "lr-nacre-cluster",
                        "Nacre Cluster",
                        2.54,
                        1.36,
                        DistanceUnits.LightYear,
                        1.2,
                        AsteroidTypes.CType)),
                    LongRangeContact(new Asteroid(
                        "lr-kepler-fragment",
                        "Kepler Fragment",
                        0.44,
                        3.18,
                        DistanceUnits.LightYear,
                        0.82,
                        AsteroidTypes.MType)),
                    LongRangeContact(new Asteroid(
                        "lr-sable-stone",
                        "Sable Stone",
                        -2.72,
                        -1.18,
                        DistanceUnits.LightYear,
                        0.72,
                        AsteroidTypes.SType))
                ]),
            new SensorScan(
                "local-sector",
                "Local Sector Sensors",
                8_000,
                DistanceUnits.Kilometer,
                [
                    LocalContact(new Asteroid(
                        "local-kite-rock",
                        "Kite Rock",
                        1_180,
                        -940,
                        DistanceUnits.Kilometer,
                        0.72,
                        AsteroidTypes.CType)),
                    LocalContact(new Asteroid(
                        "local-ice-shard",
                        "Ice Shard",
                        5_240,
                        690,
                        DistanceUnits.Kilometer,
                        0.48,
                        AsteroidTypes.SType)),
                    LocalContact(new Asteroid(
                        "local-dust-stone",
                        "Dust Stone",
                        -3_620,
                        2_180,
                        DistanceUnits.Kilometer,
                        0.92,
                        AsteroidTypes.MType)),
                    LocalContact(new Asteroid(
                        "local-silent-core",
                        "Silent Core",
                        820,
                        4_360,
                        DistanceUnits.Kilometer,
                        0.56,
                        AsteroidTypes.MType))
                ]));
    }

    private static SensorContact LongRangeContact(Asteroid asteroid)
    {
        var distance = DistanceFromOrigin(asteroid.X, asteroid.Y);

        return new SensorContact(
            asteroid.Id,
            asteroid.Name,
            asteroid.Kind,
            asteroid.Type.Id,
            asteroid.Type.Label,
            asteroid.X,
            asteroid.Y,
            distance,
            distance * SecondsPerLightYear,
            asteroid.MarkerScale,
            []);
    }

    private static SensorContact LocalContact(Asteroid asteroid)
    {
        var distance = DistanceFromOrigin(asteroid.X, asteroid.Y);

        return new SensorContact(
            asteroid.Id,
            asteroid.Name,
            asteroid.Kind,
            asteroid.Type.Id,
            asteroid.Type.Label,
            asteroid.X,
            asteroid.Y,
            distance,
            distance / LightSpeedKilometersPerSecond,
            asteroid.MarkerScale,
            asteroid.Type.Resources.Estimates);
    }

    private static double DistanceFromOrigin(double x, double y)
    {
        return Math.Sqrt((x * x) + (y * y));
    }
}
