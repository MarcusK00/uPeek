using System.Collections.Concurrent;
using Microsoft.Extensions.Options;
using Umbraco.Community.Peek.Configuration;

namespace Umbraco.Community.Peek.Observations;

public interface IPeekObservationBuffer
{
    /// <summary>Non-blocking. Drops rather than grows without bound.</summary>
    void Add(PeekPageObservation observation);

    /// <summary>Counts an eligible page view whether or not it was sampled. This is the denominator.</summary>
    void CountEligibleView();

    PeekObservationSnapshot Drain();

    int PendingCount { get; }
}

/// <summary>
///     In-memory hold for sampled observations between flushes.
/// </summary>
/// <remarks>
///     Observations are telemetry, not transactional data: losing the last few seconds of them on an
///     app pool recycle is fine, and far preferable to writing a row per page view. The buffer is
///     bounded, and a full buffer drops new observations rather than accepting unbounded memory
///     growth — the dropped count is surfaced in the sampling status so it cannot fail silently.
/// </remarks>
public sealed class PeekObservationBuffer : IPeekObservationBuffer
{
    private readonly ConcurrentQueue<PeekPageObservation> _queue = new();
    private readonly IOptionsMonitor<PeekOptions> _options;
    private long _eligibleViews;
    private long _dropped;

    public PeekObservationBuffer(IOptionsMonitor<PeekOptions> options) => _options = options;

    public int PendingCount => _queue.Count;

    public void Add(PeekPageObservation observation)
    {
        if (_queue.Count >= _options.CurrentValue.Sampling.MaxBufferedObservations)
        {
            Interlocked.Increment(ref _dropped);
            return;
        }

        _queue.Enqueue(observation);
    }

    public void CountEligibleView() => Interlocked.Increment(ref _eligibleViews);

    public PeekObservationSnapshot Drain()
    {
        var drained = new List<PeekPageObservation>(_queue.Count);
        while (_queue.TryDequeue(out var observation))
        {
            drained.Add(observation);
        }

        return new PeekObservationSnapshot
        {
            Observations = drained,
            EligibleViews = Interlocked.Exchange(ref _eligibleViews, 0),
            Dropped = Interlocked.Exchange(ref _dropped, 0),
        };
    }
}
