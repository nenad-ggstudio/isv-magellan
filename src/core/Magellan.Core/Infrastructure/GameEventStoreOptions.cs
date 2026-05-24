namespace Infrastructure;

public sealed class GameEventStoreOptions
{
    public const string SectionName = "GameEventStore";

    public bool LogTickEvents { get; set; }
}
