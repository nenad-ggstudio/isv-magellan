using System.Text.Json;
using World.SpaceObjects.Asteroids;

namespace World;

public sealed record GameWorld(
    WorldPosition ShipPosition,
    DateTimeOffset CurrentTime,
    LongRangeMap LongRangeMap,
    JumpAreaMap JumpAreaMap,
    LocalMap LocalMap
)
{
    private const string LongRangeMapPath = "World/Data/long-range-map.json";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private const double LightSpeedKilometersPerSecond = 299_792.458;
    private const double JumpAreaSpanLightYears = 2;
    private const double JumpAreaRadiusLightYears = JumpAreaSpanLightYears / 2;
    private const double LocalMapRadiusKilometers = 10_000;
    private const double LocalAsteroidInnerRadiusKilometers = 750;
    private const double LocalAsteroidMinimumSpeedKilometersPerSecond = 0.4;
    private const double LocalAsteroidMaximumSpeedKilometersPerSecond = 2.4;
    private const int MinimumLocalAsteroidCount = 12;
    private const int MaximumLocalAsteroidCount = 18;

    private static readonly (string Kind, string Label)[] SensorAnomalyTypes =
    [
        (SensorAnomalyKinds.RoguePlanet, "Rogue Planet"),
        (SensorAnomalyKinds.AsteroidCluster, "Asteroid Cluster"),
        (SensorAnomalyKinds.Comet, "Comet"),
        (SensorAnomalyKinds.EnergyParticleWells, "Energy Particle Wells"),
    ];
    private static readonly AsteroidType[] LocalAsteroidTypes =
    [
        AsteroidTypes.CType,
        AsteroidTypes.SType,
        AsteroidTypes.MType,
    ];

    public static GameWorld StartingWorld(DateTimeOffset currentTime)
    {
        var longRangeMapData = LoadLongRangeMapData();
        var originSystem =
            longRangeMapData.Systems.FirstOrDefault(system => system.Role == "origin")
            ?? throw new InvalidOperationException(
                $"Long range map '{LongRangeMapPath}' must define an origin system."
            );
        var shipPosition = new WorldPosition(
            originSystem.Name,
            originSystem.X,
            originSystem.Y,
            longRangeMapData.DistanceUnit
        );
        var longRangeMap = BuildLongRangeMap(longRangeMapData, shipPosition);

        return new GameWorld(
            shipPosition,
            currentTime,
            longRangeMap,
            BuildJumpAreaMap(longRangeMap, shipPosition, currentTime),
            BuildLocalMap(shipPosition, currentTime)
        );
    }

    public GameWorld JumpTo(
        double destinationX,
        double destinationY,
        DateTimeOffset jumpedAt)
    {
        var shipPosition = new WorldPosition(
            "Deep Space",
            destinationX,
            destinationY,
            LongRangeMap.DistanceUnit);
        var longRangeMap = LongRangeMap with
        {
            Systems =
            [
                .. LongRangeMap.Systems.Select(system => system with
                {
                    Distance = DistanceBetween(
                        destinationX,
                        destinationY,
                        system.X,
                        system.Y)
                })
            ]
        };

        return new GameWorld(
            shipPosition,
            jumpedAt,
            longRangeMap,
            BuildJumpAreaMap(longRangeMap, shipPosition, jumpedAt),
            BuildLocalMap(shipPosition, jumpedAt));
    }

    private static LongRangeMapData LoadLongRangeMapData()
    {
        var path = Path.Combine(AppContext.BaseDirectory, LongRangeMapPath);

        if (!File.Exists(path))
        {
            throw new FileNotFoundException(
                $"Long range map data file was not found at '{path}'.",
                path
            );
        }

        using var stream = File.OpenRead(path);
        var longRangeMap = JsonSerializer.Deserialize<LongRangeMapData>(stream, JsonOptions);

        return longRangeMap
            ?? throw new InvalidOperationException(
                $"Long range map data file '{path}' could not be deserialized."
            );
    }

    private static LongRangeMap BuildLongRangeMap(LongRangeMapData data, WorldPosition shipPosition)
    {
        return new LongRangeMap(
            data.Id,
            data.Label,
            data.Width,
            data.Height,
            data.DistanceUnit,
            [
                .. data.Systems.Select(system => new StellarSystem(
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
                    system.ResourceDetections
                )),
            ]
        );
    }

    private static JumpAreaMap BuildJumpAreaMap(
        LongRangeMap longRangeMap,
        WorldPosition shipPosition,
        DateTimeOffset currentTime
    )
    {
        var center = JumpAreaSpanLightYears / 2;

        return new JumpAreaMap(
            "jump-area",
            "Jump Area",
            JumpAreaSpanLightYears,
            JumpAreaSpanLightYears,
            longRangeMap.DistanceUnit,
            [
                .. longRangeMap
                    .Systems.Select(system =>
                        system with
                        {
                            X = center + system.X - shipPosition.X,
                            Y = center + system.Y - shipPosition.Y,
                        }
                    )
                    .Where(system => IsInsideJumpArea(system.X, system.Y))
                    .OrderBy(system => system.Distance),
            ],
            BuildDefaultSensorAnomalies(shipPosition, currentTime)
        );
    }

    private static SensorAnomaly[] BuildDefaultSensorAnomalies(
        WorldPosition shipPosition,
        DateTimeOffset currentTime
    )
    {
        var random = new Random(GetJumpAreaSeed(shipPosition, currentTime));
        var anomalyCount = random.Next(5, 7);

        return
        [
            .. Enumerable.Range(1, anomalyCount).Select(index => BuildSensorAnomaly(index, random)),
        ];
    }

    private static SensorAnomaly BuildSensorAnomaly(int index, Random random)
    {
        var center = JumpAreaSpanLightYears / 2;
        var distance = Math.Sqrt(random.NextDouble()) * JumpAreaRadiusLightYears;
        var angleRadians = random.NextDouble() * Math.Tau;
        var (Kind, Label) = SensorAnomalyTypes[random.Next(SensorAnomalyTypes.Length)];
        var (Speed, Angle, Mass, Energy) = GetAnomalySignature(Kind, random);

        return new SensorAnomaly(
            $"jump-anomaly-{index:000}",
            Kind,
            Label,
            center + (Math.Cos(angleRadians) * distance),
            center + (Math.Sin(angleRadians) * distance),
            Speed,
            Angle,
            Mass,
            Energy
        );
    }

    private static (int Speed, double Angle, int Mass, int Energy) GetAnomalySignature(
        string kind,
        Random random
    )
    {
        var angleRadians = random.NextDouble() * Math.Tau;
        switch (kind)
        {
            case SensorAnomalyKinds.AsteroidCluster:
            {
                return (
                    RandomInteger(random, 28, 56),
                    angleRadians,
                    RandomInteger(random, 44, 78),
                    RandomInteger(random, 30, 62));
            }
            case SensorAnomalyKinds.Comet:
            {
                return (
                    RandomInteger(random, 62, 100),
                    angleRadians,
                    RandomInteger(random, 12, 42),
                    RandomInteger(random, 50, 86));
            }
            case SensorAnomalyKinds.RoguePlanet:
            {
                return (
                    RandomInteger(random, 1, 24),
                    angleRadians,
                    RandomInteger(random, 72, 100),
                    RandomInteger(random, 8, 35));
            }
            case SensorAnomalyKinds.EnergyParticleWells:
            {
                return (
                    RandomInteger(random, 10, 38),
                    angleRadians,
                    RandomInteger(random, 4, 30),
                    RandomInteger(random, 78, 100));
            }
            default:
                throw new NotSupportedException();
        }
    }

    private static int RandomInteger(Random random, int minimum, int maximum)
    {
        return random.Next(minimum, maximum + 1);
    }

    private static int GetJumpAreaSeed(WorldPosition shipPosition, DateTimeOffset currentTime)
    {
        return unchecked(
            (int)currentTime.ToUnixTimeMilliseconds()
            ^ (int)(shipPosition.X * 1_000)
            ^ (int)(shipPosition.Y * 10_000)
        );
    }

    private static bool IsInsideJumpArea(double x, double y)
    {
        return x >= 0 && x <= JumpAreaSpanLightYears && y >= 0 && y <= JumpAreaSpanLightYears;
    }

    private static LocalMap BuildLocalMap(WorldPosition shipPosition, DateTimeOffset currentTime)
    {
        var random = new Random(GetLocalMapSeed(shipPosition, currentTime));
        var asteroidCount = random.Next(MinimumLocalAsteroidCount, MaximumLocalAsteroidCount + 1);
        var typeCounts = LocalAsteroidTypes.ToDictionary(type => type.Id, _ => 0);

        return new LocalMap(
            "local-map",
            "Local Map",
            LocalMapRadiusKilometers,
            DistanceUnits.Kilometer,
            [
                .. Enumerable
                    .Range(1, asteroidCount)
                    .Select(index => LocalContact(BuildLocalAsteroid(index, random, typeCounts)))
                    .OrderBy(contact => contact.Distance),
            ]
        );
    }

    private static Asteroid BuildLocalAsteroid(
        int index,
        Random random,
        Dictionary<string, int> typeCounts
    )
    {
        var asteroidType =
            index <= LocalAsteroidTypes.Length
                ? LocalAsteroidTypes[index - 1]
                : LocalAsteroidTypes[random.Next(LocalAsteroidTypes.Length)];
        var typeIndex = typeCounts[asteroidType.Id] + 1;
        typeCounts[asteroidType.Id] = typeIndex;
        var typeCode = GetAsteroidTypeCode(asteroidType);
        var distance = RandomDistanceInAnnulus(
            random,
            LocalAsteroidInnerRadiusKilometers,
            LocalMapRadiusKilometers
        );
        var angleRadians = random.NextDouble() * Math.Tau;
        var speed = RandomDouble(
            random,
            LocalAsteroidMinimumSpeedKilometersPerSecond,
            LocalAsteroidMaximumSpeedKilometersPerSecond
        );

        return new Asteroid(
            $"local-{typeCode.ToLowerInvariant()}-type-{typeIndex:00}",
            $"{typeCode}-Type {typeIndex:00}",
            Math.Sin(angleRadians) * distance,
            Math.Cos(angleRadians) * distance,
            DistanceUnits.Kilometer,
            Math.Round(speed, 2),
            random.Next(0, 360),
            asteroidType
        );
    }

    private static double RandomDistanceInAnnulus(
        Random random,
        double innerRadius,
        double outerRadius
    )
    {
        var innerArea = innerRadius * innerRadius;
        var outerArea = outerRadius * outerRadius;

        return Math.Sqrt(RandomDouble(random, innerArea, outerArea));
    }

    private static double RandomDouble(Random random, double minimum, double maximum)
    {
        return minimum + ((maximum - minimum) * random.NextDouble());
    }

    private static string GetAsteroidTypeCode(AsteroidType asteroidType)
    {
        return asteroidType.Id switch
        {
            "c-type" => "C",
            "s-type" => "S",
            "m-type" => "M",
            _ => "X",
        };
    }

    private static LocalMapContact LocalContact(Asteroid asteroid)
    {
        var distance = DistanceFromOrigin(asteroid.X, asteroid.Y);

        return new LocalMapContact(
            asteroid.Id,
            asteroid.Name,
            asteroid.Kind,
            asteroid.Type.Id,
            asteroid.Type.Label,
            asteroid.X,
            asteroid.Y,
            distance,
            distance / LightSpeedKilometersPerSecond,
            asteroid.SpeedKilometersPerSecond,
            asteroid.DirectionDegrees,
            asteroid.Type.Resources.Estimates
        );
    }

    private static double DistanceFromOrigin(double x, double y)
    {
        return Math.Sqrt((x * x) + (y * y));
    }

    private static int GetLocalMapSeed(WorldPosition shipPosition, DateTimeOffset currentTime)
    {
        return unchecked(
            (int)currentTime.ToUnixTimeMilliseconds()
            ^ (int)(shipPosition.X * 31_000)
            ^ (int)(shipPosition.Y * 17_000)
            ^ 0x4C4F434C
        );
    }

    private static double DistanceBetween(double originX, double originY, double x, double y)
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
        IReadOnlyList<StellarSystemData> Systems
    );

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
        IReadOnlyList<ResourceDetection> ResourceDetections
    );
}
