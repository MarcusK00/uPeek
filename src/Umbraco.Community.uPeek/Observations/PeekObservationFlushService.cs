using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Services;
using Umbraco.Community.uPeek.Configuration;

namespace Umbraco.Community.uPeek.Observations;

/// <summary>
///     Drains the observation buffer to storage on a timer, and prunes anything past the retention
///     window while it is there.
/// </summary>
/// <remarks>
///     Never write per request. A site doing 12,000 views a month should not produce 12,000
///     database writes to answer a question about which properties are dead.
/// </remarks>
public sealed class PeekObservationFlushService : BackgroundService
{
    private readonly IPeekObservationBuffer _buffer;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IRuntimeState _runtimeState;
    private readonly IOptionsMonitor<PeekOptions> _options;
    private readonly ILogger<PeekObservationFlushService> _logger;

    private DateTime _lastPrune = DateTime.MinValue;

    public PeekObservationFlushService(
        IPeekObservationBuffer buffer,
        IServiceScopeFactory scopeFactory,
        IRuntimeState runtimeState,
        IOptionsMonitor<PeekOptions> options,
        ILogger<PeekObservationFlushService> logger)
    {
        _buffer = buffer;
        _scopeFactory = scopeFactory;
        _runtimeState = runtimeState;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (stoppingToken.IsCancellationRequested is false)
        {
            var options = _options.CurrentValue;

            try
            {
                await Task.Delay(options.Sampling.FlushInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }

            if (options.Enabled is false || options.Sampling.Enabled is false)
            {
                continue;
            }

            if (_runtimeState.Level < RuntimeLevel.Run)
            {
                continue;
            }

            await FlushAsync(options, stoppingToken);
        }

        // Best effort on shutdown, so an orderly recycle does not lose the current window.
        await FlushAsync(_options.CurrentValue, CancellationToken.None);
    }

    private async Task FlushAsync(PeekOptions options, CancellationToken cancellationToken)
    {
        var snapshot = _buffer.Drain();
        if (snapshot.Observations.Count == 0 && snapshot.EligibleViews == 0)
        {
            return;
        }

        if (snapshot.Dropped > 0)
        {
            _logger.LogWarning(
                "uPeek dropped {Dropped} observations because the buffer was full. " +
                "Lower uPeek:Sampling:SampleRate or raise uPeek:Sampling:MaxBufferedObservations.",
                snapshot.Dropped);
        }

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var repository = scope.ServiceProvider.GetRequiredService<IPeekObservationRepository>();

            await repository.PersistAsync(snapshot, cancellationToken);

            if (DateTime.UtcNow - _lastPrune > TimeSpan.FromHours(6))
            {
                await repository.PruneAsync(options.Sampling.RetentionDays, cancellationToken);
                _lastPrune = DateTime.UtcNow;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "uPeek could not flush {Count} observations.", snapshot.Observations.Count);
        }
    }
}
