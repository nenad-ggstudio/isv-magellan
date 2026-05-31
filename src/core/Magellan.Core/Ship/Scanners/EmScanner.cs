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

    private const double MinimumAmplitudePixels = 10;
    private const double MaximumAmplitudePixels = 180;
    private const double MinimumWavelengthPixels = 80;
    private const double MaximumWavelengthPixels = 620;

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
        double filter,
        double phaseErrorRadians)
    {
        if (CurrentScan is null)
        {
            return this;
        }

        var clampedFocus = Clamp(focus, 1, 100);
        var clampedFilter = Clamp(filter, 1, 100);
        var report = BuildReport(
            CurrentScan,
            jumpAreaMap,
            capturedAtTick,
            clampedFocus,
            clampedFilter,
            NormalizeSignedPhase(phaseErrorRadians),
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
        double phaseErrorRadians,
        int reportNumber)
    {
        var candidate = FindStrongestAnomaly(jumpAreaMap, scan.Target, scan.RadiusLightYears);
        var reportId = $"{scan.Id}-report-{reportNumber:000}";
        var phaseScore = GetPhaseScore(phaseErrorRadians);

        if (candidate is null)
        {
            return new EmScanReport(
                reportId,
                scan.Id,
                capturedAtTick,
                scan.Target,
                scan.RadiusLightYears,
                0,
                0,
                Math.Round(phaseScore, 3),
                EmScanConfidenceLabels.Unstable,
                EmScanLockStates.NoSignal,
                Math.Round(focus, 1),
                Math.Round(filter, 1),
                BuildNoSignalReading(),
                "Reposition scanner");
        }

        var (anomaly, distance, proximitySignal) = candidate.Value;
        var filterScore = GetFilterScore(filter, GetIdealFilter(anomaly));
        var signalConfidence = Clamp((filterScore + phaseScore) / 2, 0, 1);
        var random = new Random(BuildReportSeed(
            scan.Id,
            anomaly.Id,
            focus,
            filter,
            phaseErrorRadians));

        return new EmScanReport(
            reportId,
            scan.Id,
            capturedAtTick,
            scan.Target,
            scan.RadiusLightYears,
            Math.Round(signalConfidence, 3),
            Math.Round(filterScore, 3),
            Math.Round(phaseScore, 3),
            GetConfidenceLabel(signalConfidence),
            GetLockState(signalConfidence, distance, scan.RadiusLightYears),
            Math.Round(focus, 1),
            Math.Round(filter, 1),
            BuildReadingSummary(anomaly, signalConfidence, random),
            GetRecommendedFollowUp(signalConfidence));
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
                0,
                32,
                350,
                0,
                50,
                50,
                EmScanLockStates.NoSignal);
        }

        var (anomaly, distance, proximitySignal) = candidate.Value;

        return new EmScanSignalProfile(
            unchecked((uint)seed),
            Math.Round(Clamp(proximitySignal, 0, 1), 3),
            Math.Round(GetAmplitude(anomaly.Mass), 1),
            Math.Round(GetWavelength(anomaly.Energy), 1),
            Math.Round(GetPhaseShiftRadians(anomaly.Speed), 4),
            Math.Round(GetIdealFilter(anomaly), 1),
            Math.Round(GetIdealFocus(anomaly), 1),
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
                var signal = Math.Pow(proximity, 1.35);

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
        double filter,
        double phaseErrorRadians)
    {
        unchecked
        {
            var hash = 17;
            hash = FoldHash(hash, scanId);
            hash = FoldHash(hash, anomalyId);
            hash = FoldHash(hash, (int)(focus * 10));
            hash = FoldHash(hash, (int)(filter * 10));
            hash = FoldHash(hash, (int)(phaseErrorRadians * 10_000));

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

    private static double GetAmplitude(int mass)
    {
        return Lerp(
            MinimumAmplitudePixels,
            MaximumAmplitudePixels,
            (Clamp(mass, 1, 100) - 1) / 99);
    }

    private static double GetWavelength(int energy)
    {
        return Lerp(
            MaximumWavelengthPixels,
            MinimumWavelengthPixels,
            (Clamp(energy, 1, 100) - 1) / 99);
    }

    private static double GetPhaseShiftRadians(int speed)
    {
        return Lerp(0, Math.PI, (Clamp(speed, 1, 100) - 1) / 99);
    }

    private static double GetIdealFilter(SensorAnomaly anomaly)
    {
        return (anomaly.Mass + anomaly.Energy) / 2.0;
    }

    private static double GetIdealFocus(SensorAnomaly anomaly)
    {
        return (anomaly.Speed + anomaly.Energy) / 2.0;
    }

    private static double GetFilterScore(double filter, double idealFilter)
    {
        var distance = Math.Abs(filter - idealFilter);
        var maxDistance = Math.Max(idealFilter, 100 - idealFilter);
        var noiseFactor = Clamp(distance / Math.Max(1, maxDistance), 0, 1);

        return 1 - noiseFactor;
    }

    private static double GetPhaseScore(double phaseErrorRadians)
    {
        var driftAmount = Clamp(
            Math.Abs(NormalizeSignedPhase(phaseErrorRadians)) / Math.PI,
            0,
            1);

        return 1 - driftAmount;
    }

    private static string BuildNoSignalReading()
    {
        return "No stable anomaly reading. Waveform alignment did not isolate a source; mass or energy output and motion or energy output are unreadable.";
    }

    private static string BuildReadingSummary(
        SensorAnomaly anomaly,
        double confidence,
        Random random)
    {
        if (confidence < 0.35)
        {
            return BuildNoSignalReading();
        }

        var powerOutput = GetOutputBand(
            (anomaly.Mass + anomaly.Energy) / 2.0,
            confidence,
            random);
        var motionOutput = GetOutputBand(
            (anomaly.Speed + anomaly.Energy) / 2.0,
            confidence,
            random);

        return confidence switch
        {
            < 0.54 =>
                $"Weak anomaly reading. The trace hints at {powerOutput} mass or energy output and {motionOutput} motion or energy output, but the lock is too noisy for a firm profile.",
            < 0.72 =>
                $"Readable anomaly reading. Waveform shape suggests {powerOutput} mass or energy output. Phase behavior suggests {motionOutput} motion or energy output. Residual noise remains.",
            < 0.9 =>
                $"Clean anomaly reading. Stable return is consistent with {powerOutput} mass or energy output and {motionOutput} motion or energy output.",
            _ =>
                $"Locked anomaly reading. Strong coherent return indicates {powerOutput} mass or energy output with {motionOutput} motion or energy output."
        };
    }

    private static string GetOutputBand(double value, double confidence, Random random)
    {
        if (confidence < 0.35)
        {
            return "unreadable";
        }

        var fuzzedValue = Clamp(
            value + (SignedRandom(random) * (1 - confidence) * 42),
            1,
            100);
        var band = fuzzedValue switch
        {
            < 34 => "low",
            < 67 => "moderate",
            _ => "high"
        };

        return confidence < 0.58
            ? $"possible {band}"
            : band;
    }

    private static string GetRecommendedFollowUp(double confidence)
    {
        return confidence < 0.35
            ? "Retune filter and focus"
            : "Spectral scan";
    }

    private static string GetConfidenceLabel(double confidence)
    {
        return confidence switch
        {
            >= 0.9 => EmScanConfidenceLabels.Locked,
            >= 0.72 => EmScanConfidenceLabels.Clean,
            >= 0.54 => EmScanConfidenceLabels.Readable,
            >= 0.32 => EmScanConfidenceLabels.Weak,
            _ => EmScanConfidenceLabels.Unstable
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

    private static double SignedRandom(Random random)
    {
        return (random.NextDouble() * 2) - 1;
    }

    private static double NormalizeSignedPhase(double radians)
    {
        return Math.Atan2(Math.Sin(radians), Math.Cos(radians));
    }

    private static double Lerp(double start, double end, double amount)
    {
        return start + ((end - start) * amount);
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
    double BaseAmplitude,
    double PrimaryWavelength,
    double PhaseShiftRadians,
    double IdealFilter,
    double IdealFocus,
    string LockState);

public sealed record EmScanReport(
    string Id,
    string SourceScanId,
    long CapturedAtTick,
    EmScanTarget Target,
    double RadiusLightYears,
    double SignalConfidence,
    double FilterScore,
    double PhaseScore,
    string Confidence,
    string LockState,
    double Focus,
    double Filter,
    string ReadingSummary,
    string RecommendedFollowUp);

public static class EmScanConfidenceLabels
{
    public const string Unstable = "unstable";
    public const string Weak = "weak";
    public const string Readable = "readable";
    public const string Clean = "clean";
    public const string Locked = "locked";
}

public static class EmScanLockStates
{
    public const string NoSignal = "no-signal";
    public const string WeakLock = "weak-lock";
    public const string PartialLock = "partial-lock";
    public const string StableLock = "stable-lock";
}
