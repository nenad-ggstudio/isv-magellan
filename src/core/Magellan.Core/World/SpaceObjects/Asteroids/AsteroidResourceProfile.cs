using World;

namespace World.SpaceObjects.Asteroids;

public sealed record AsteroidResourceProfile(
    ResourceEstimate Water,
    ResourceEstimate Lithium,
    ResourceEstimate Carbon)
{
    public IReadOnlyList<ResourceEstimate> Estimates => [Water, Lithium, Carbon];
}
