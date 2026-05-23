using System.Globalization;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Events;

namespace Infrastructure;

public sealed class FileGameEventStore : IGameEventStore, IDisposable
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly Lock syncRoot = new();
    private readonly SemaphoreSlim appendGate = new(1, 1);
    private readonly List<GameEventEnvelope> events = [];
    private readonly List<PersistedGameEvent> persistedGameEvents = [];
    private readonly string gameEventsPath;
    private readonly StreamWriter tickWriter;
    private long sequence;

    public long CurrentSequence => Interlocked.Read(ref sequence);

    public FileGameEventStore(IWebHostEnvironment environment)
    {
        var dataDirectory = Path.Combine(environment.ContentRootPath, "App_Data");
        Directory.CreateDirectory(dataDirectory);

        gameEventsPath = Path.Combine(dataDirectory, "game-events.json");
        var tickEventsPath = Path.Combine(dataDirectory, "tick-game-events.tsv");

        LoadExistingGameEvents(gameEventsPath);
        LoadTickSequence(tickEventsPath);

        tickWriter = new StreamWriter(
            new FileStream(
                tickEventsPath,
                FileMode.Append,
                FileAccess.Write,
                FileShare.Read,
                bufferSize: 64 * 1024,
                FileOptions.Asynchronous));
    }

    public async ValueTask<GameEventEnvelope> AppendAsync(
        GameEvent gameEvent,
        CancellationToken cancellationToken = default)
    {
        await appendGate.WaitAsync(cancellationToken);

        try
        {
            var envelope = new GameEventEnvelope(
                sequence + 1,
                DateTimeOffset.UtcNow,
                gameEvent);

            if (gameEvent is TickGameEvent tickGameEvent)
            {
                await AppendTickEvent(envelope, tickGameEvent, cancellationToken);
            }
            else
            {
                await AppendGameEvent(envelope, cancellationToken);
            }

            lock (syncRoot)
            {
                Interlocked.Exchange(ref sequence, envelope.Sequence);

                if (gameEvent is not TickGameEvent)
                {
                    events.Add(envelope);
                }
            }

            return envelope;
        }
        finally
        {
            appendGate.Release();
        }
    }

    public async IAsyncEnumerable<GameEventEnvelope> ReadAsync(
        long afterSequence = 0,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        GameEventEnvelope[] snapshot;

        lock (syncRoot)
        {
            snapshot = events
                .Where(gameEvent => gameEvent.Sequence > afterSequence)
                .ToArray();
        }

        foreach (var gameEvent in snapshot)
        {
            cancellationToken.ThrowIfCancellationRequested();
            yield return gameEvent;
        }

        await Task.CompletedTask;
    }

    public void Dispose()
    {
        tickWriter.Dispose();
        appendGate.Dispose();
    }

    private async Task AppendGameEvent(
        GameEventEnvelope envelope,
        CancellationToken cancellationToken)
    {
        var persistedEvent = PersistedGameEvent.FromEnvelope(envelope);
        PersistedGameEvent[] snapshot;

        lock (syncRoot)
        {
            snapshot = [.. persistedGameEvents, persistedEvent];
        }

        await File.WriteAllTextAsync(
            gameEventsPath,
            JsonSerializer.Serialize(snapshot, JsonOptions),
            cancellationToken);

        lock (syncRoot)
        {
            persistedGameEvents.Add(persistedEvent);
        }
    }

    private async Task AppendTickEvent(
        GameEventEnvelope envelope,
        TickGameEvent tickGameEvent,
        CancellationToken cancellationToken)
    {
        var line = string.Create(
            CultureInfo.InvariantCulture,
            $"{envelope.Sequence}\t{envelope.OccurredAt.ToUnixTimeMilliseconds()}\t{tickGameEvent.ConnectionId}\t{tickGameEvent.Tick.ElapsedMilliseconds}\t{tickGameEvent.Tick.Tick}");

        await tickWriter.WriteLineAsync(line.AsMemory(), cancellationToken);
    }

    private void LoadExistingGameEvents(string path)
    {
        if (!File.Exists(path))
        {
            return;
        }

        var json = File.ReadAllText(path);

        if (string.IsNullOrWhiteSpace(json))
        {
            return;
        }

        var persistedEvents =
            JsonSerializer.Deserialize<List<PersistedGameEvent>>(json, JsonOptions) ?? [];

        foreach (var persistedEvent in persistedEvents)
        {
            persistedGameEvents.Add(persistedEvent);
            sequence = Math.Max(sequence, persistedEvent.Sequence);

            var envelope = persistedEvent.ToEnvelope();

            if (envelope is null)
            {
                continue;
            }

            events.Add(envelope);
        }
    }

    private void LoadTickSequence(string path)
    {
        if (!File.Exists(path))
        {
            return;
        }

        foreach (var line in File.ReadLines(path))
        {
            var separatorIndex = line.IndexOf('\t');
            var sequenceValue = separatorIndex >= 0
                ? line[..separatorIndex]
                : line;

            if (long.TryParse(
                sequenceValue,
                NumberStyles.None,
                CultureInfo.InvariantCulture,
                out var tickSequence))
            {
                sequence = Math.Max(sequence, tickSequence);
            }
        }
    }

    private sealed record PersistedGameEvent(
        long Sequence,
        DateTimeOffset OccurredAt,
        string Type,
        string ConnectionId,
        JsonElement Payload)
    {
        public static PersistedGameEvent FromEnvelope(GameEventEnvelope envelope)
        {
            return new PersistedGameEvent(
                envelope.Sequence,
                envelope.OccurredAt,
                envelope.Event.GetType().FullName ?? envelope.Event.GetType().Name,
                envelope.Event.ConnectionId,
                JsonSerializer.SerializeToElement(
                    envelope.Event,
                    envelope.Event.GetType(),
                    JsonOptions));
        }

        public GameEventEnvelope? ToEnvelope()
        {
            var eventType = ResolveEventType(Type);

            if (eventType is null || !typeof(GameEvent).IsAssignableFrom(eventType))
            {
                return null;
            }

            var gameEvent = (GameEvent?)Payload.Deserialize(eventType, JsonOptions);

            return gameEvent is null
                ? null
                : new GameEventEnvelope(Sequence, OccurredAt, gameEvent);
        }

        private static Type? ResolveEventType(string typeName)
        {
            return typeof(GameEvent).Assembly.GetType(typeName)
                ?? AppDomain.CurrentDomain
                    .GetAssemblies()
                    .Select(assembly => assembly.GetType(typeName))
                    .FirstOrDefault(type => type is not null);
        }
    }
}
