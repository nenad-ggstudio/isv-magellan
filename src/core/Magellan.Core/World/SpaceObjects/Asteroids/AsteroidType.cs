namespace World.SpaceObjects.Asteroids;

public sealed record AsteroidType(
    string Id,
    string Label,
    AsteroidResourceProfile Resources);
