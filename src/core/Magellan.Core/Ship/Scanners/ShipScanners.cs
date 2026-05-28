namespace Ship.Scanners;

public sealed record ShipScanners(GravityScanner GravityScanner)
{
    public static ShipScanners StartingScanners()
    {
        return new ShipScanners(GravityScanner.StartingScanner());
    }
}
