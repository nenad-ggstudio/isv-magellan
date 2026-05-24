using World;

namespace World.SpaceObjects.Asteroids;

public static class AsteroidTypes
{
    public static readonly AsteroidType CType = new(
        "c-type",
        "C-type asteroid",
        new AsteroidResourceProfile(
            new ResourceEstimate(ResourceNames.Water, 0.6, 0.85, "lots"),
            new ResourceEstimate(ResourceNames.Lithium, 0, 0.04, "trace"),
            new ResourceEstimate(ResourceNames.Carbon, 0.45, 0.7, "lots")));

    public static readonly AsteroidType SType = new(
        "s-type",
        "S-type asteroid",
        new AsteroidResourceProfile(
            new ResourceEstimate(ResourceNames.Water, 0.01, 0.06, "very little"),
            new ResourceEstimate(ResourceNames.Lithium, 0, 0, "none"),
            new ResourceEstimate(ResourceNames.Carbon, 0.02, 0.08, "trace")));

    public static readonly AsteroidType MType = new(
        "m-type",
        "M-type asteroid",
        new AsteroidResourceProfile(
            new ResourceEstimate(ResourceNames.Water, 0, 0, "none"),
            new ResourceEstimate(ResourceNames.Lithium, 0.55, 0.85, "lots"),
            new ResourceEstimate(ResourceNames.Carbon, 0.01, 0.05, "trace")));
}
