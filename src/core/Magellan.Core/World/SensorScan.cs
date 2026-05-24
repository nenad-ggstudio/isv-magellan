namespace World;

public sealed record SensorScan(
    string Id,
    string Label,
    double Radius,
    string DistanceUnit,
    IReadOnlyList<SensorContact> Contacts);
