using System.Text.Json;

namespace Infrastructure;

public sealed class FileGameSaveStore : IGameSaveStore, IDisposable
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly SemaphoreSlim accessGate = new(1, 1);
    private readonly string savePath;

    public FileGameSaveStore(IWebHostEnvironment environment)
    {
        var savesDirectory = Path.Combine(environment.ContentRootPath, "App_Data", "Saves");
        Directory.CreateDirectory(savesDirectory);
        savePath = Path.Combine(savesDirectory, "manual-save.json");
    }

    public Task<bool> ExistsAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(File.Exists(savePath));
    }

    public async Task<GameSave?> LoadAsync(CancellationToken cancellationToken = default)
    {
        await accessGate.WaitAsync(cancellationToken);

        try
        {
            if (!File.Exists(savePath))
            {
                return null;
            }

            await using var stream = new FileStream(
                savePath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read,
                bufferSize: 64 * 1024,
                FileOptions.Asynchronous | FileOptions.SequentialScan);
            var save = await JsonSerializer.DeserializeAsync<GameSave>(
                stream,
                JsonOptions,
                cancellationToken);

            if (save is null || save.FormatVersion != GameSave.CurrentFormatVersion)
            {
                throw new InvalidDataException(
                    $"The game save format is not supported: {save?.FormatVersion}.");
            }

            return save;
        }
        finally
        {
            accessGate.Release();
        }
    }

    public async Task SaveAsync(GameSave save, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(save);
        await accessGate.WaitAsync(cancellationToken);

        var temporaryPath = savePath + ".tmp";

        try
        {
            await using (var stream = new FileStream(
                temporaryPath,
                FileMode.Create,
                FileAccess.Write,
                FileShare.None,
                bufferSize: 64 * 1024,
                FileOptions.Asynchronous))
            {
                await JsonSerializer.SerializeAsync(
                    stream,
                    save,
                    JsonOptions,
                    cancellationToken);
                await stream.FlushAsync(cancellationToken);
            }

            File.Move(temporaryPath, savePath, overwrite: true);
        }
        finally
        {
            if (File.Exists(temporaryPath))
            {
                File.Delete(temporaryPath);
            }

            accessGate.Release();
        }
    }

    public void Dispose()
    {
        accessGate.Dispose();
    }
}
