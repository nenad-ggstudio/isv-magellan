namespace World.SpaceObjects;

public abstract record SpaceObject(
    string Id,
    string Name,
    double X,
    double Y,
    string DistanceUnit,
    double MarkerScale)
{
    public abstract string Kind { get; }
}
