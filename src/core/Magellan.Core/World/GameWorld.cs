using System.Text.Json;
using World.SpaceObjects.Asteroids;

namespace World;

public sealed record GameWorld(
    WorldPosition ShipPosition,
    DateTimeOffset CurrentTime,
    LongRangeMap LongRangeMap,
    JumpAreaMap JumpAreaMap,
    SensorScan LocalSectorScan)
{
    private const string LongRangeMapPath = "World/Data/long-range-map.json";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private const double LightSpeedKilometersPerSecond = 299_792.458;
    private const double JumpAreaSpanLightYears = 2;
    private const double JumpAreaRadiusLightYears = JumpAreaSpanLightYears / 2;
    private static readonly (string Kind, string Label)[] SensorAnomalyTypes =
    [
        (SensorAnomalyKinds.RoguePlanet, "Rogue Planet"),
        (SensorAnomalyKinds.AsteroidCluster, "Asteroid Cluster"),
        (SensorAnomalyKinds.Comet, "Comet"),
        (SensorAnomalyKinds.EnergyParticleWells, "Energy Particle Wells")
    ];

    public static GameWorld StartingWorld(DateTimeOffset currentTime)
    {
        var longRangeMapData = LoadLongRangeMapData();
        var originSystem = longRangeMapData.Systems
            .FirstOrDefault(system => system.Role == "origin")
            ?? throw new InvalidOperationException(
                $"Long range map '{LongRangeMapPath}' must define an origin system.");
        var shipPosition = new WorldPosition(
            originSystem.Name,
            originSystem.X,
            originSystem.Y,
            longRangeMapData.DistanceUnit);
        var longRangeMap = BuildLongRangeMap(longRangeMapData, shipPosition);

        return new GameWorld(
            shipPosition,
            currentTime,
            longRangeMap,
            BuildJumpAreaMap(longRangeMap, shipPosition, currentTime),
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

    private static LongRangeMapData LoadLongRangeMapData()
    {
        var path = Path.Combine(
            AppContext.BaseDirectory,
            LongRangeMapPath);

        if (!File.Exists(path))
        {
            throw new FileNotFoundException(
                $"Long range map data file was not found at '{path}'.",
                path);
        }

        using var stream = File.OpenRead(path);
        var longRangeMap = JsonSerializer.Deserialize<LongRangeMapData>(
            stream,
            JsonOptions);

        return longRangeMap
            ?? throw new InvalidOperationException(
                $"Long range map data file '{path}' could not be deserialized.");
    }

    private static LongRangeMap BuildLongRangeMap(
        LongRangeMapData data,
        WorldPosition shipPosition)
    {
        return new LongRangeMap(
            data.Id,
            data.Label,
            data.Width,
            data.Height,
            data.DistanceUnit,
            data.Systems
                .Select(system => new StellarSystem(
                    system.Id,
                    system.Name,
                    system.Role,
                    system.StarType,
                    system.StarSizeSolarRadii,
                    system.X,
                    system.Y,
                    DistanceBetween(shipPosition.X, shipPosition.Y, system.X, system.Y),
                    system.PlanetCountPrediction,
                    system.PlanetCountAccuracy,
                    system.ResourceDetections))
                .ToArray());
    }

    private static JumpAreaMap BuildJumpAreaMap(
        LongRangeMap longRangeMap,
        WorldPosition shipPosition,
        DateTimeOffset currentTime)
    {
        var center = JumpAreaSpanLightYears / 2;

        return new JumpAreaMap(
            "jump-area",
            "Jump Area",
            JumpAreaSpanLightYears,
            JumpAreaSpanLightYears,
            longRangeMap.DistanceUnit,
            longRangeMap.Systems
                .Select(system => system with
                {
                    X = center + system.X - shipPosition.X,
                    Y = center + system.Y - shipPosition.Y
                })
                .Where(system => IsInsideJumpArea(system.X, system.Y))
                .OrderBy(system => system.Distance)
                .ToArray(),
            BuildDefaultSensorAnomalies(shipPosition, currentTime));
    }

    private static SensorAnomaly[] BuildDefaultSensorAnomalies(
        WorldPosition shipPosition,
        DateTimeOffset currentTime)
    {
        var random = new Random(GetJumpAreaSeed(shipPosition, currentTime));
        var anomalyCount = random.Next(5, 7);

        return Enumerable.Range(1, anomalyCount)
            .Select(index => BuildSensorAnomaly(index, random))
            .ToArray();
    }

    private static SensorAnomaly BuildSensorAnomaly(int index, Random random)
    {
        var center = JumpAreaSpanLightYears / 2;
        var distance = Math.Sqrt(random.NextDouble()) * JumpAreaRadiusLightYears;
        var angleRadians = random.NextDouble() * Math.Tau;
        var anomalyType = SensorAnomalyTypes[random.Next(SensorAnomalyTypes.Length)];

        return new SensorAnomaly(
            $"jump-anomaly-{index:000}",
            anomalyType.Kind,
            anomalyType.Label,
            center + (Math.Cos(angleRadians) * distance),
            center + (Math.Sin(angleRadians) * distance),
            distance);
    }

    private static int GetJumpAreaSeed(
        WorldPosition shipPosition,
        DateTimeOffset currentTime)
    {
        return unchecked(
            (int)currentTime.ToUnixTimeMilliseconds() ^
            (int)(shipPosition.X * 1_000) ^
            (int)(shipPosition.Y * 10_000));
    }

    private static bool IsInsideJumpArea(double x, double y)
    {
        return
            x >= 0 &&
            x <= JumpAreaSpanLightYears &&
            y >= 0 &&
            y <= JumpAreaSpanLightYears;
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

    private static double DistanceBetween(
        double originX,
        double originY,
        double x,
        double y)
    {
        var deltaX = x - originX;
        var deltaY = y - originY;

        return Math.Sqrt((deltaX * deltaX) + (deltaY * deltaY));
    }

    private sealed record LongRangeMapData(
        string Id,
        string Label,
        double Width,
        double Height,
        string DistanceUnit,
        IReadOnlyList<StellarSystemData> Systems);

    private sealed record StellarSystemData(
        string Id,
        string Name,
        string Role,
        string StarType,
        double StarSizeSolarRadii,
        double X,
        double Y,
        int PlanetCountPrediction,
        double PlanetCountAccuracy,
        IReadOnlyList<ResourceDetection> ResourceDetections);
}
