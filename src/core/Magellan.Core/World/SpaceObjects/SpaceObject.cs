namespace World.SpaceObjects;

public abstract record SpaceObject(
    string Id,
    string Name,
    double X,
    double Y,
    string DistanceUnit)
{
    public abstract string Kind { get; }
}
