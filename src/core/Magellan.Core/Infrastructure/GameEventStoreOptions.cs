namespace Infrastructure;

public sealed class GameEventStoreOptions
{
    public const string SectionName = "GameEventStore";

    public bool LogTickEvents { get; set; }

    public int ReplayBufferCapacity { get; set; } = 10_000;
}
