using System.Globalization;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Events;
using Microsoft.Extensions.Options;

namespace Infrastructure;

public sealed class FileGameEventStore : IGameEventStore, IDisposable
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly Lock syncRoot = new();
    private readonly SemaphoreSlim appendGate = new(1, 1);
    private readonly Queue<GameEventEnvelope> replayEvents = [];
    private readonly string gameEventsPath;
    private readonly string tickEventsPath;
    private readonly bool logTickEvents;
    private readonly int replayBufferCapacity;
    private StreamWriter? gameEventWriter;
    private StreamWriter? tickWriter;
    private long sequence;

    public long CurrentSequence => Interlocked.Read(ref sequence);

    public FileGameEventStore(
        IWebHostEnvironment environment,
        IOptions<GameEventStoreOptions> options)
    {
        logTickEvents = options.Value.LogTickEvents;
        replayBufferCapacity = Math.Max(1, options.Value.ReplayBufferCapacity);

        var dataDirectory = Path.Combine(environment.ContentRootPath, "App_Data");
        Directory.CreateDirectory(dataDirectory);

        gameEventsPath = Path.Combine(dataDirectory, "game-events.jsonl");
        tickEventsPath = Path.Combine(dataDirectory, "tick-game-events.tsv");

        LoadGameEventSequence(gameEventsPath);
        LoadTickSequence(tickEventsPath);
        EnsureLogEndsWithNewLine(gameEventsPath);
        EnsureLogEndsWithNewLine(tickEventsPath);
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
            else if (gameEvent is not INonPersistedGameEvent)
            {
                await AppendGameEvent(envelope, cancellationToken);
            }

            lock (syncRoot)
            {
                Interlocked.Exchange(ref sequence, envelope.Sequence);

                if (gameEvent is not TickGameEvent)
                {
                    replayEvents.Enqueue(envelope);

                    while (replayEvents.Count > replayBufferCapacity)
                    {
                        replayEvents.Dequeue();
                    }
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
            snapshot = replayEvents
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
        gameEventWriter?.Dispose();
        tickWriter?.Dispose();
        appendGate.Dispose();
    }

    private async Task AppendGameEvent(
        GameEventEnvelope envelope,
        CancellationToken cancellationToken)
    {
        gameEventWriter ??= CreateAppendWriter(gameEventsPath);
        var persistedEvent = PersistedGameEvent.FromEnvelope(envelope);
        var line = JsonSerializer.Serialize(persistedEvent, JsonOptions);

        await gameEventWriter.WriteLineAsync(line.AsMemory(), cancellationToken);
    }

    private async Task AppendTickEvent(
        GameEventEnvelope envelope,
        TickGameEvent tickGameEvent,
        CancellationToken cancellationToken)
    {
        if (!logTickEvents)
        {
            return;
        }

        tickWriter ??= CreateAppendWriter(tickEventsPath);

        var line = string.Create(
            CultureInfo.InvariantCulture,
            $"{envelope.Sequence}\t{envelope.OccurredAt.ToUnixTimeMilliseconds()}\t{tickGameEvent.GameId}\t{tickGameEvent.Tick.ElapsedMilliseconds}\t{tickGameEvent.Tick.Tick}");

        await tickWriter.WriteLineAsync(line.AsMemory(), cancellationToken);
    }

    private void LoadGameEventSequence(string path)
    {
        if (!File.Exists(path))
        {
            return;
        }

        foreach (var line in File.ReadLines(path))
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            try
            {
                var persistedEvent = JsonSerializer.Deserialize<PersistedGameEvent>(line, JsonOptions);

                if (persistedEvent is not null)
                {
                    sequence = Math.Max(sequence, persistedEvent.Sequence);
                }
            }
            catch (JsonException)
            {
                // A diagnostic log may end with a partial line after an interrupted write.
            }
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

    private static StreamWriter CreateAppendWriter(string path)
    {
        return new StreamWriter(
            new FileStream(
                path,
                FileMode.Append,
                FileAccess.Write,
                FileShare.Read,
                bufferSize: 64 * 1024,
                FileOptions.Asynchronous))
        {
            AutoFlush = true
        };
    }

    private static void EnsureLogEndsWithNewLine(string path)
    {
        if (!File.Exists(path) || new FileInfo(path).Length == 0)
        {
            return;
        }

        using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
        stream.Seek(-1, SeekOrigin.End);

        if (stream.ReadByte() != '\n')
        {
            File.AppendAllText(path, Environment.NewLine);
        }
    }

    private sealed record PersistedGameEvent(
        long Sequence,
        DateTimeOffset OccurredAt,
        string Type,
        Guid GameId,
        JsonElement Payload)
    {
        public static PersistedGameEvent FromEnvelope(GameEventEnvelope envelope)
        {
            return new PersistedGameEvent(
                envelope.Sequence,
                envelope.OccurredAt,
                envelope.Event.GetType().FullName ?? envelope.Event.GetType().Name,
                envelope.Event.GameId,
                JsonSerializer.SerializeToElement(
                    envelope.Event,
                    envelope.Event.GetType(),
                    JsonOptions));
        }
    }
}
