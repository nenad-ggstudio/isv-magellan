var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.AddSingleton<GameEngine>();
builder.Services.AddHostedService(serviceProvider =>
    serviceProvider.GetRequiredService<GameEngine>());

var app = builder.Build();

app.MapGet("/", () => "Hello World!");
app.MapHub<GameHub>("/hubs/game");

app.Run();
