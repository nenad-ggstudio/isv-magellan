using Infrastructure;
using Infrastructure.Logging;
using Microsoft.AspNetCore.SignalR;
using Serilog;
using Serilog.Events;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, loggerConfiguration) =>
    {
        loggerConfiguration
            .MinimumLevel.Information()
            .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
            .Enrich.FromLogContext()
            .WriteTo.Console()
            .WriteTo.File(
                Path.Combine(
                    context.HostingEnvironment.ContentRootPath,
                    "logs",
                    "magellan-.log"),
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: 14);
    });

    builder.Services.AddSignalR(options =>
    {
        options.AddFilter(typeof(ClientHubLoggingFilter));
    });
    builder.Services.AddSingleton<IGameEventStore, FileGameEventStore>();
    builder.Services.AddSingleton<IGameEventBus, GameEventBus>();
    builder.Services.AddSingleton<GameEngine>();
    builder.Services.AddSingleton<GameManager>();
    builder.Services.AddHostedService(serviceProvider =>
        serviceProvider.GetRequiredService<GameEngine>());
    builder.Services.AddHostedService<SignalREventRelay>();

    var app = builder.Build();

    app.UseSerilogRequestLogging(options =>
    {
        options.MessageTemplate =
            "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms.";
    });

    app.MapGet("/", () => "Hello World!");
    app.MapHub<GameHub>("/hubs/game");

    app.Run();
}
catch (Exception exception)
{
    Log.Fatal(exception, "Magellan host terminated unexpectedly.");
}
finally
{
    Log.CloseAndFlush();
}
