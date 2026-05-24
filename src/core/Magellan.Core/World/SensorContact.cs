namespace World;

public sealed record SensorContact(
    string Id,
    string Name,
    string Kind,
    double X,
    double Y,
    double Distance,
    double SignalAgeSeconds,
    string Classification,
    double MarkerScale);
