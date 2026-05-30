namespace Ship.Scanners;

public sealed record ShipScanners(
    GravityScanner GravityScanner,
    EmScanner EmScanner)
{
    public static ShipScanners StartingScanners()
    {
        return new ShipScanners(
            GravityScanner.StartingScanner(),
            EmScanner.StartingScanner());
    }
}
