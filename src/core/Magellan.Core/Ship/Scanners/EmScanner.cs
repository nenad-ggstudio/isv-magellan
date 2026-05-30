using World;

namespace Ship.Scanners;

public sealed record EmScanner(
    string Id,
    string Label,
    double ScanRadiusLightYears,
    IReadOnlyList<EmScanReport> Reports,
    EmScannerScan? CurrentScan)
{
    public const double DefaultScanRadiusLightYears = 0.1;
    public const int PowerDrainIntervalTicks = 10;
    public const double PowerDrainChargeLevel = 0.001;

    private const double MinimumSignalStrength = 0.02;

    public static EmScanner StartingScanner()
    {
        return new EmScanner(
            "em-scanner",
            "EM Scanner",
            DefaultScanRadiusLightYears,
            [],
            null);
    }

    public bool IsScanActive()
    {
        return CurrentScan is not null;
    }

    public EmScanner StartScan(
        long startedAtTick,
        double targetX,
        double targetY,
        JumpAreaMap jumpAreaMap)
    {
        if (IsScanActive())
        {
            return this;
        }

        var target = new EmScanTarget(
            Clamp(targetX, 0, jumpAreaMap.Width),
            Clamp(targetY, 0, jumpAreaMap.Height));
        var seed = BuildScanSeed(jumpAreaMap, startedAtTick, target);
        var signalProfile = BuildSignalProfile(jumpAreaMap, target, seed);

        return this with
        {
            CurrentScan = new EmScannerScan(
                $"em-scan-{unchecked((uint)seed):x8}",
                startedAtTick,
                startedAtTick,
                target,
                ScanRadiusLightYears,
                signalProfile)
        };
    }

    public EmScanner StopScan()
    {
        return this with
        {
            CurrentScan = null
        };
    }

    public EmScanner WithPowerDrainCheckpoint(long lastPowerDrainedAtTick)
    {
        return CurrentScan is null
            ? this
            : this with
            {
                CurrentScan = CurrentScan with
                {
                    LastPowerDrainedAtTick = lastPowerDrainedAtTick
                }
            };
    }

    public EmScanner CaptureReport(
        long capturedAtTick,
        JumpAreaMap jumpAreaMap,
        double focus,
        double filter)
    {
        if (CurrentScan is null)
        {
            return this;
        }

        var normalizedFocus = Clamp(focus, 0, 1);
        var normalizedFilter = Clamp(filter, 0, 1);
        var report = BuildReport(
            CurrentScan,
            jumpAreaMap,
            capturedAtTick,
            normalizedFocus,
            normalizedFilter,
            Reports.Count + 1);

        return this with
        {
            Reports = [.. Reports, report]
        };
    }

    private EmScanReport BuildReport(
        EmScannerScan scan,
        JumpAreaMap jumpAreaMap,
        long capturedAtTick,
        double focus,
        double filter,
        int reportNumber)
    {
        var candidate = FindStrongestAnomaly(jumpAreaMap, scan.Target, scan.RadiusLightYears);
        var reportId = $"{scan.Id}-report-{reportNumber:000}";

        if (candidate is null)
        {
            var noSignalRandom = new Random(BuildReportSeed(scan.Id, "no-signal", focus, filter));
            var noSignalStrength = 0.03 + (noSignalRandom.NextDouble() * 0.12);
            var noSignalCoherence = noSignalRandom.NextDouble() * 0.22;
            var noSignalDriftStability = noSignalRandom.NextDouble() * 0.18;

            return new EmScanReport(
                reportId,
                scan.Id,
                capturedAtTick,
                scan.Target,
                scan.RadiusLightYears,
                Math.Round(noSignalStrength, 3),
                Math.Round(noSignalCoherence, 3),
                Math.Round(noSignalDriftStability, 3),
                null,
                null,
                null,
                "none",
                EmScanLockStates.NoSignal,
                Math.Round(focus, 3),
                Math.Round(filter, 3));
        }

        var (anomaly, distance, proximitySignal) = candidate.Value;
        var focusIdeal = 1 - anomaly.Distortion;
        var filterIdeal = Clamp(0.25 + (anomaly.Distortion * 0.55), 0, 1);
        var focusFit = Fit(focus, focusIdeal);
        var filterFit = Fit(filter, filterIdeal);
        var signalStrength = Clamp(
            MinimumSignalStrength + (proximitySignal * (1.08 - (filter * 0.48))),
            0,
            1);
        var coherence = Clamp(
            (focusFit * 0.82)
            + (signalStrength * 0.18)
            - (Math.Abs(focus - focusIdeal) * anomaly.Distortion * 0.18),
            0,
            1);
        var driftStability = Clamp(
            (filterFit * (0.72 + (focusFit * 0.22)))
            - ((1 - filter) * anomaly.Distortion * 0.12),
            0,
            1);
        var accuracy = Clamp((signalStrength + coherence + driftStability) / 3, 0, 1);
        var random = new Random(BuildReportSeed(scan.Id, anomaly.Id, focus, filter));
        var speedError = anomaly.Speed * (0.75 * (1 - accuracy));
        var angleError = 120 * (1 - accuracy);
        var distortionError = 0.5 * (1 - accuracy);
        var estimatedSpeed = Math.Max(
            0,
            anomaly.Speed + (SignedRandom(random) * speedError));
        var estimatedAngleDegrees = NormalizeDegrees(
            RadiansToDegrees(anomaly.Angle) + (SignedRandom(random) * angleError));
        var estimatedDistortion = Clamp(
            anomaly.Distortion + (SignedRandom(random) * distortionError),
            0,
            1);

        return new EmScanReport(
            reportId,
            scan.Id,
            capturedAtTick,
            scan.Target,
            scan.RadiusLightYears,
            Math.Round(signalStrength, 3),
            Math.Round(coherence, 3),
            Math.Round(driftStability, 3),
            Math.Round(estimatedSpeed, 3),
            Math.Round(estimatedAngleDegrees, 1),
            Math.Round(estimatedDistortion, 3),
            GetConfidenceLabel(accuracy),
            GetLockState(accuracy, distance, scan.RadiusLightYears),
            Math.Round(focus, 3),
            Math.Round(filter, 3));
    }

    private static EmScanSignalProfile BuildSignalProfile(
        JumpAreaMap jumpAreaMap,
        EmScanTarget target,
        int seed)
    {
        var candidate = FindStrongestAnomaly(
            jumpAreaMap,
            target,
            DefaultScanRadiusLightYears);

        if (candidate is null)
        {
            return new EmScanSignalProfile(
                unchecked((uint)seed),
                0.08,
                0.74,
                0.5,
                0.5,
                1.8,
                0.8,
                EmScanLockStates.NoSignal);
        }

        var (anomaly, distance, proximitySignal) = candidate.Value;
        var focusBias = 1 - anomaly.Distortion;
        var filterBias = Clamp(0.25 + (anomaly.Distortion * 0.55), 0, 1);
        var noiseLevel = Clamp(0.18 + ((distance / DefaultScanRadiusLightYears) * 0.42), 0, 1);

        return new EmScanSignalProfile(
            unchecked((uint)seed),
            Math.Round(Clamp(proximitySignal, 0, 1), 3),
            Math.Round(noiseLevel, 3),
            Math.Round(focusBias, 3),
            Math.Round(filterBias, 3),
            Math.Round(1.2 + (anomaly.Speed * 0.18), 3),
            Math.Round(0.7 + (anomaly.Distortion * 1.4), 3),
            GetLockState(proximitySignal, distance, DefaultScanRadiusLightYears));
    }

    private static (SensorAnomaly Anomaly, double Distance, double Signal)?
        FindStrongestAnomaly(
            JumpAreaMap jumpAreaMap,
            EmScanTarget target,
            double radiusLightYears)
    {
        return jumpAreaMap
            .Anomalies
            .Select(anomaly =>
            {
                var distance = DistanceBetween(target.X, target.Y, anomaly.X, anomaly.Y);
                var proximity = Clamp(1 - (distance / radiusLightYears), 0, 1);
                var signal = Math.Pow(proximity, 1.35) * (1 - (anomaly.Distortion * 0.08));

                return (Anomaly: anomaly, Distance: distance, Signal: signal);
            })
            .Where(candidate => candidate.Distance <= radiusLightYears)
            .OrderByDescending(candidate => candidate.Signal)
            .FirstOrDefault() is { Signal: > 0 } strongest
                ? strongest
                : null;
    }

    private static int BuildScanSeed(
        JumpAreaMap jumpAreaMap,
        long startedAtTick,
        EmScanTarget target)
    {
        unchecked
        {
            var hash = 17;
            hash = FoldHash(hash, jumpAreaMap.Id);
            hash = FoldHash(hash, (int)startedAtTick);
            hash = FoldHash(hash, (int)(target.X * 100_000));
            hash = FoldHash(hash, (int)(target.Y * 100_000));

            return hash;
        }
    }

    private static int BuildReportSeed(
        string scanId,
        string anomalyId,
        double focus,
        double filter)
    {
        unchecked
        {
            var hash = 17;
            hash = FoldHash(hash, scanId);
            hash = FoldHash(hash, anomalyId);
            hash = FoldHash(hash, (int)(focus * 1000));
            hash = FoldHash(hash, (int)(filter * 1000));

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

    private static double Fit(double value, double ideal)
    {
        return Clamp(1 - Math.Abs(value - ideal), 0, 1);
    }

    private static double SignedRandom(Random random)
    {
        return (random.NextDouble() * 2) - 1;
    }

    private static string GetConfidenceLabel(double accuracy)
    {
        return accuracy switch
        {
            >= 0.96 => "absolute",
            >= 0.78 => "high",
            >= 0.58 => "medium",
            >= 0.36 => "low-medium",
            > 0.16 => "low",
            _ => "none"
        };
    }

    private static string GetLockState(
        double accuracy,
        double distance,
        double radiusLightYears)
    {
        var distanceFit = Clamp(1 - (distance / radiusLightYears), 0, 1);
        var lockFit = (accuracy * 0.72) + (distanceFit * 0.28);

        return lockFit switch
        {
            >= 0.78 => EmScanLockStates.StableLock,
            >= 0.48 => EmScanLockStates.PartialLock,
            > 0.16 => EmScanLockStates.WeakLock,
            _ => EmScanLockStates.NoSignal
        };
    }

    private static double RadiansToDegrees(double radians)
    {
        return radians * 180 / Math.PI;
    }

    private static double NormalizeDegrees(double degrees)
    {
        return ((degrees % 360) + 360) % 360;
    }

    private static double Clamp(double value, double minimum, double maximum)
    {
        return Math.Min(maximum, Math.Max(minimum, value));
    }
}

public sealed record EmScannerScan(
    string Id,
    long StartedAtTick,
    long LastPowerDrainedAtTick,
    EmScanTarget Target,
    double RadiusLightYears,
    EmScanSignalProfile SignalProfile);

public sealed record EmScanTarget(double X, double Y);

public sealed record EmScanSignalProfile(
    uint NoiseSeed,
    double BaseStrength,
    double NoiseLevel,
    double FocusBias,
    double FilterBias,
    double PrimaryFrequency,
    double DriftFrequency,
    string LockState);

public sealed record EmScanReport(
    string Id,
    string SourceScanId,
    long CapturedAtTick,
    EmScanTarget Target,
    double RadiusLightYears,
    double SignalStrength,
    double Coherence,
    double DriftStability,
    double? EstimatedSpeedKilometersPerSecond,
    double? EstimatedAngleDegrees,
    double? EstimatedDistortion,
    string Confidence,
    string LockState,
    double Focus,
    double Filter);

public static class EmScanLockStates
{
    public const string NoSignal = "no-signal";
    public const string WeakLock = "weak-lock";
    public const string PartialLock = "partial-lock";
    public const string StableLock = "stable-lock";
}
