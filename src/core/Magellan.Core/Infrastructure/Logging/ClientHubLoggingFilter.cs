using System.Diagnostics;
using Microsoft.AspNetCore.SignalR;

namespace Infrastructure.Logging;

public sealed class ClientHubLoggingFilter(ILogger<ClientHubLoggingFilter> logger) : IHubFilter
{
    public async ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext invocationContext,
        Func<HubInvocationContext, ValueTask<object?>> next)
    {
        var startedAt = Stopwatch.GetTimestamp();
        var connectionId = invocationContext.Context.ConnectionId;
        var methodName = invocationContext.HubMethodName;

        logger.LogInformation(
            "Client hub request {HubMethod} started for connection {ConnectionId} with {ArgumentCount} arguments.",
            methodName,
            connectionId,
            invocationContext.HubMethodArguments.Count);

        try
        {
            var result = await next(invocationContext);
            var elapsed = Stopwatch.GetElapsedTime(startedAt);

            logger.LogInformation(
                "Client hub request {HubMethod} completed for connection {ConnectionId} in {ElapsedMilliseconds} ms.",
                methodName,
                connectionId,
                elapsed.TotalMilliseconds);

            return result;
        }
        catch (Exception exception)
        {
            var elapsed = Stopwatch.GetElapsedTime(startedAt);

            logger.LogWarning(
                exception,
                "Client hub request {HubMethod} failed for connection {ConnectionId} after {ElapsedMilliseconds} ms.",
                methodName,
                connectionId,
                elapsed.TotalMilliseconds);

            throw;
        }
    }

    public async Task OnConnectedAsync(
        HubLifetimeContext context,
        Func<HubLifetimeContext, Task> next)
    {
        logger.LogInformation(
            "Client hub connection started for connection {ConnectionId}.",
            context.Context.ConnectionId);

        await next(context);
    }

    public async Task OnDisconnectedAsync(
        HubLifetimeContext context,
        Exception? exception,
        Func<HubLifetimeContext, Exception?, Task> next)
    {
        if (exception is null)
        {
            logger.LogInformation(
                "Client hub connection ended for connection {ConnectionId}.",
                context.Context.ConnectionId);
        }
        else
        {
            logger.LogWarning(
                exception,
                "Client hub connection ended with error for connection {ConnectionId}.",
                context.Context.ConnectionId);
        }

        await next(context, exception);
    }
}
