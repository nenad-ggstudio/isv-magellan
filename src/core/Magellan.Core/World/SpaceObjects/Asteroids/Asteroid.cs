using World.SpaceObjects;

namespace World.SpaceObjects.Asteroids;

public sealed record Asteroid(
    string Id,
    string Name,
    double X,
    double Y,
    string DistanceUnit,
    double MarkerScale,
    AsteroidType Type) : SpaceObject(Id, Name, X, Y, DistanceUnit, MarkerScale)
{
    public const string ObjectKind = "asteroid";

    public override string Kind => ObjectKind;
}
