using World.SpaceObjects;

namespace World.SpaceObjects.Asteroids;

public sealed record Asteroid(
    string Id,
    string Name,
    double X,
    double Y,
    string DistanceUnit,
    double SpeedKilometersPerSecond,
    double DirectionDegrees,
    AsteroidType Type) : SpaceObject(Id, Name, X, Y, DistanceUnit)
{
    public const string ObjectKind = "asteroid";

    public override string Kind => ObjectKind;
}
