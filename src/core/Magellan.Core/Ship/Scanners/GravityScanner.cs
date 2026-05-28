using World;

namespace Ship.Scanners;

public sealed record GravityScanner(
    string Id,
    string Label,
    int ScanDurationTicks,
    GravityScannerScan? CurrentScan)
{
    public const int DefaultScanDurationTicks = 40;

    private const int HeatMapColumns = 192;
    private const int HeatMapRows = 192;
    private const double RoguePlanetAmplitude = 0.28;
    private const double RoguePlanetSigma = 0.014;
    private const double CometAmplitude = 0.16;
    private const double CometParallelSigma = 0.12;
    private const double CometPerpendicularSigma = 0.018;
    private const double AsteroidClusterAmplitude = 0.045;
    private const double AsteroidClusterSigma = 0.026;
    private const double StellarCoreSigma = 0.07;
    private const double StellarHaloSigma = 0.42;
    private const double StellarNoiseSigma = 0.24;

    public static GravityScanner StartingScanner()
    {
        return new GravityScanner(
            "gravity-scanner",
            "Gravity Scanner",
            DefaultScanDurationTicks,
            null);
    }

    public bool IsScanInProgress(long tick)
    {
        return CurrentScan is { } currentScan && tick < currentScan.CompletesAtTick;
    }

    public GravityScanner StartScan(long startedAtTick, JumpAreaMap jumpAreaMap)
    {
        if (IsScanInProgress(startedAtTick))
        {
            return this;
        }

        var completesAtTick = startedAtTick + ScanDurationTicks;
        var result = BuildScanResult(jumpAreaMap, startedAtTick);

        return this with
        {
            CurrentScan = new GravityScannerScan(startedAtTick, completesAtTick, result)
        };
    }

    private static GravityScanResult BuildScanResult(JumpAreaMap jumpAreaMap, long generatedAtTick)
    {
        var seed = BuildScanSeed(jumpAreaMap, generatedAtTick);
        var random = new Random(seed);
        var anomalyProfiles = BuildAnomalyProfiles(jumpAreaMap.Anomalies, random);
        var values = new double[HeatMapColumns * HeatMapRows];
        var rawValues = new double[values.Length];
        var cellWidth = jumpAreaMap.Width / HeatMapColumns;
        var cellHeight = jumpAreaMap.Height / HeatMapRows;
        var maxSignal = 0.000001;
        var totalNoise = 0.0;

        for (var row = 0; row < HeatMapRows; row++)
        {
            for (var column = 0; column < HeatMapColumns; column++)
            {
                var x = (column + 0.5) * cellWidth;
                var y = (row + 0.5) * cellHeight;
                var stellarGravity = BuildStellarGravity(x, y, jumpAreaMap.Systems);
                var noise = BuildBackgroundNoise(x, y, jumpAreaMap.Systems, random);
                var signal = stellarGravity
                    + noise
                    + anomalyProfiles.Sum(profile => profile.MeasureAt(x, y, random));
                var index = (row * HeatMapColumns) + column;

                rawValues[index] = signal;
                maxSignal = Math.Max(maxSignal, signal);
                totalNoise += noise;
            }
        }

        for (var index = 0; index < rawValues.Length; index++)
        {
            values[index] = Math.Round(Clamp(rawValues[index] / maxSignal, 0, 1), 3);
        }

        return new GravityScanResult(
            $"gravity-scan-{unchecked((uint)seed):x8}",
            generatedAtTick,
            Math.Round(totalNoise / rawValues.Length, 3),
            new GravityHeatMap(
                HeatMapColumns,
                HeatMapRows,
                jumpAreaMap.Width,
                jumpAreaMap.Height,
                values));
    }

    private static IReadOnlyList<GravityAnomalyProfile> BuildAnomalyProfiles(
        IReadOnlyList<SensorAnomaly> anomalies,
        Random random)
    {
        return anomalies
            .Select(anomaly => GravityAnomalyProfile.ForAnomaly(anomaly, random))
            .ToArray();
    }

    private static double BuildBackgroundNoise(
        double x,
        double y,
        IReadOnlyList<StellarSystem> systems,
        Random random)
    {
        var baseNoise = 0.015 + (random.NextDouble() * 0.045);
        var stellarNoise = systems.Sum(system =>
        {
            var distance = DistanceBetween(x, y, system.X, system.Y);
            var proximity = Gaussian(distance, StellarNoiseSigma);
            var starIntensity = 0.09 + Math.Min(0.08, system.StarSizeSolarRadii * 0.025);
            var flicker = 0.55 + random.NextDouble();

            return proximity * starIntensity * flicker;
        });

        return baseNoise + stellarNoise;
    }

    private static double BuildStellarGravity(
        double x,
        double y,
        IReadOnlyList<StellarSystem> systems)
    {
        return systems.Sum(system =>
        {
            var distance = DistanceBetween(x, y, system.X, system.Y);
            var starMassFactor = 1 + Math.Min(0.8, system.StarSizeSolarRadii * 0.18);
            var core = 1.65 * starMassFactor * Gaussian(distance, StellarCoreSigma);
            var halo = 0.78 * starMassFactor * Gaussian(distance, StellarHaloSigma);

            return core + halo;
        });
    }

    private static int BuildScanSeed(JumpAreaMap jumpAreaMap, long generatedAtTick)
    {
        unchecked
        {
            var hash = 17;
            hash = FoldHash(hash, jumpAreaMap.Id);
            hash = FoldHash(hash, (int)generatedAtTick);
            hash = FoldHash(hash, (int)(jumpAreaMap.Width * 10_000));
            hash = FoldHash(hash, (int)(jumpAreaMap.Height * 10_000));

            foreach (var system in jumpAreaMap.Systems)
            {
                hash = FoldHash(hash, system.Id);
                hash = FoldHash(hash, (int)(system.X * 100_000));
                hash = FoldHash(hash, (int)(system.Y * 100_000));
            }

            foreach (var anomaly in jumpAreaMap.Anomalies)
            {
                hash = FoldHash(hash, anomaly.Id);
                hash = FoldHash(hash, anomaly.Kind);
                hash = FoldHash(hash, (int)(anomaly.X * 100_000));
                hash = FoldHash(hash, (int)(anomaly.Y * 100_000));
            }

            return hash;
        }
    }

    private static int FoldHash(int hash, string value)
    {
        unchecked
        {
            foreach (var character in value)
            {
                hash = (hash * 31) + character;
            }

            return hash;
        }
    }

    private static int FoldHash(int hash, int value)
    {
        unchecked
        {
            return (hash * 31) + value;
        }
    }

    private static double DistanceBetween(double x1, double y1, double x2, double y2)
    {
        var deltaX = x2 - x1;
        var deltaY = y2 - y1;

        return Math.Sqrt((deltaX * deltaX) + (deltaY * deltaY));
    }

    private static double Gaussian(double distance, double sigma)
    {
        return Math.Exp(-((distance * distance) / (2 * sigma * sigma)));
    }

    private static double Clamp(double value, double minimum, double maximum)
    {
        return Math.Min(maximum, Math.Max(minimum, value));
    }

    private sealed record GravityAnomalyProfile(
        SensorAnomaly Anomaly,
        double AngleRadians,
        IReadOnlyList<(double X, double Y, double Amplitude)> ClusterNodes)
    {
        public static GravityAnomalyProfile ForAnomaly(SensorAnomaly anomaly, Random random)
        {
            var clusterNodes = anomaly.Kind == SensorAnomalyKinds.AsteroidCluster
                ? BuildClusterNodes(anomaly, random)
                : [];

            return new GravityAnomalyProfile(
                anomaly,
                random.NextDouble() * Math.Tau,
                clusterNodes);
        }

        public double MeasureAt(double x, double y, Random random)
        {
            return Anomaly.Kind switch
            {
                SensorAnomalyKinds.RoguePlanet => MeasureRoguePlanet(x, y),
                SensorAnomalyKinds.Comet => MeasureComet(x, y, random),
                SensorAnomalyKinds.AsteroidCluster => MeasureAsteroidCluster(x, y, random),
                SensorAnomalyKinds.EnergyParticleWells => 0,
                _ => 0
            };
        }

        private double MeasureRoguePlanet(double x, double y)
        {
            return RoguePlanetAmplitude
                * Gaussian(DistanceBetween(x, y, Anomaly.X, Anomaly.Y), RoguePlanetSigma);
        }

        private double MeasureComet(double x, double y, Random random)
        {
            var deltaX = x - Anomaly.X;
            var deltaY = y - Anomaly.Y;
            var cos = Math.Cos(AngleRadians);
            var sin = Math.Sin(AngleRadians);
            var parallel = (deltaX * cos) + (deltaY * sin);
            var perpendicular = Math.Abs((-deltaX * sin) + (deltaY * cos));
            var linearSignal = Math.Exp(
                -((parallel * parallel) / (2 * CometParallelSigma * CometParallelSigma))
                -((perpendicular * perpendicular) / (2 * CometPerpendicularSigma * CometPerpendicularSigma)));
            var messiness = 0.74 + (random.NextDouble() * 0.42);

            return CometAmplitude * linearSignal * messiness;
        }

        private double MeasureAsteroidCluster(double x, double y, Random random)
        {
            var clusterSignal = ClusterNodes.Sum(node =>
                node.Amplitude
                * Gaussian(DistanceBetween(x, y, node.X, node.Y), AsteroidClusterSigma));
            var grain = 0.7 + (random.NextDouble() * 0.5);

            return AsteroidClusterAmplitude * clusterSignal * grain;
        }

        private static IReadOnlyList<(double X, double Y, double Amplitude)> BuildClusterNodes(
            SensorAnomaly anomaly,
            Random random)
        {
            return Enumerable.Range(0, 5)
                .Select(_ =>
                {
                    var radius = random.NextDouble() * 0.04;
                    var angle = random.NextDouble() * Math.Tau;

                    return (
                        anomaly.X + (Math.Cos(angle) * radius),
                        anomaly.Y + (Math.Sin(angle) * radius),
                        0.25 + (random.NextDouble() * 0.35));
                })
                .ToArray();
        }
    }
}

public sealed record GravityScannerScan(
    long StartedAtTick,
    long CompletesAtTick,
    GravityScanResult Result);

public sealed record GravityScanResult(
    string Id,
    long GeneratedAtTick,
    double NoiseLevel,
    GravityHeatMap HeatMap);

public sealed record GravityHeatMap(
    int Columns,
    int Rows,
    double Width,
    double Height,
    IReadOnlyList<double> Values);
