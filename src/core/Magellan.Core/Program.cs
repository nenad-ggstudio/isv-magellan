using Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.AddSingleton<IGameEventStore, FileGameEventStore>();
builder.Services.AddSingleton<IGameEventBus, GameEventBus>();
builder.Services.AddSingleton<GameEngine>();
builder.Services.AddSingleton<GameManager>();
builder.Services.AddHostedService(serviceProvider =>
    serviceProvider.GetRequiredService<GameEngine>());
builder.Services.AddHostedService<SignalREventRelay>();

var app = builder.Build();

app.MapGet("/", () => "Hello World!");
app.MapHub<GameHub>("/hubs/game");

app.Run();
