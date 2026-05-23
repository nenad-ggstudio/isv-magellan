namespace Infrastructure;

public sealed record GameEventEnvelope(long Sequence, DateTimeOffset OccurredAt, GameEvent Event);
