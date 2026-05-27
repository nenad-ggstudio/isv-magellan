namespace World;

public sealed record LocalMap(
    string Id,
    string Label,
    double Radius,
    string DistanceUnit,
    IReadOnlyList<LocalMapContact> Contacts);
