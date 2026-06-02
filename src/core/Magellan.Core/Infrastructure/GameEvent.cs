namespace Infrastructure;

public abstract record GameEvent(Guid GameId);

public interface INonPersistedGameEvent;
