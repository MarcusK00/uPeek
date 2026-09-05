using NPoco;
using Umbraco.Cms.Core.Scoping;
using Umbraco.Cms.Infrastructure.Persistence;
using Umbraco.Cms.Infrastructure.Scoping;
using Umbraco.Community.Peek.Manifest;
using Umbraco.Community.Peek.Observations.Persistence;
using Umbraco.Extensions;
using IScopeProvider = Umbraco.Cms.Infrastructure.Scoping.IScopeProvider;

namespace Umbraco.Community.Peek.Observations;

public interface IPeekObservationRepository
{
    Task PersistAsync(PeekObservationSnapshot snapshot, CancellationToken cancellationToken);

    Task PruneAsync(int retentionDays, CancellationToken cancellationToken);

    Task<IReadOnlyList<PeekPropertyObservationDto>> GetPropertyObservationsAsync(Guid? contentTypeKey);

    Task<IReadOnlyList<PeekRenderLocationDto>> GetRenderLocationsAsync(
        Guid contentTypeKey,
        string propertyAlias,
        string? culture);

    Task<IReadOnlyList<PeekSampleDayDto>> GetSampleDaysAsync();
}

/// <summary>
///     NPoco access to the three Peek tables, through Umbraco's scope provider so that Peek
///     participates in the ambient transaction and connection pooling like any core repository.
/// </summary>
public sealed class PeekObservationRepository : IPeekObservationRepository
{
    private readonly IScopeProvider _scopeProvider;

    public PeekObservationRepository(IScopeProvider scopeProvider) => _scopeProvider = scopeProvider;

    public Task PersistAsync(PeekObservationSnapshot snapshot, CancellationToken cancellationToken)
    {
        if (snapshot.Observations.Count == 0 && snapshot.EligibleViews == 0)
        {
            return Task.CompletedTask;
        }

        using var scope = _scopeProvider.CreateScope();
        var database = scope.Database;

        PersistSampleDay(database, snapshot);
        PersistPropertyRollups(database, snapshot);
        PersistRenderLocations(database, snapshot);

        scope.Complete();
        return Task.CompletedTask;
    }

    private static void PersistSampleDay(IUmbracoDatabase database, PeekObservationSnapshot snapshot)
    {
        var day = DateTime.UtcNow.Date;
        var existing = database.SingleOrDefault<PeekSampleDayDto>(
            database.SqlContext.Sql().Select<PeekSampleDayDto>().From<PeekSampleDayDto>().Where<PeekSampleDayDto>(x => x.Day == day));

        if (existing is null)
        {
            database.Insert(new PeekSampleDayDto
            {
                Day = day,
                EligibleViews = snapshot.EligibleViews,
                SampledViews = snapshot.Observations.Count,
            });
            return;
        }

        existing.EligibleViews += snapshot.EligibleViews;
        existing.SampledViews += snapshot.Observations.Count;
        database.Update(existing);
    }

    private static void PersistPropertyRollups(IUmbracoDatabase database, PeekObservationSnapshot snapshot)
    {
        // Aggregate in memory first: a flush of 500 page views across 40 properties is 20,000
        // outcomes but only a few hundred distinct rows.
        var rollups = new Dictionary<(DateTime Day, Guid TypeKey, string Property, string Culture), PeekPropertyObservationDto>();

        foreach (var observation in snapshot.Observations)
        {
            var day = observation.ObservedAt.Date;
            foreach (var outcome in observation.Properties)
            {
                var key = (day, outcome.ContentTypeKey, outcome.PropertyAlias, outcome.Culture);
                if (rollups.TryGetValue(key, out var row) is false)
                {
                    row = new PeekPropertyObservationDto
                    {
                        Day = day,
                        ContentTypeKey = outcome.ContentTypeKey,
                        ContentTypeAlias = outcome.ContentTypeAlias,
                        PropertyAlias = outcome.PropertyAlias,
                        Culture = outcome.Culture,
                    };
                    rollups[key] = row;
                }

                row.ObservedCount++;
                switch (outcome.State)
                {
                    case PeekMatchState.Rendered:
                    case PeekMatchState.Ambiguous:
                        row.RenderedCount++;
                        break;
                    case PeekMatchState.Unmatchable:
                        row.UnmatchableCount++;
                        break;
                    case PeekMatchState.Empty:
                        row.EmptyCount++;
                        break;
                }
            }
        }

        foreach (var row in rollups.Values)
        {
            var existing = database.SingleOrDefault<PeekPropertyObservationDto>(
                database.SqlContext.Sql()
                    .Select<PeekPropertyObservationDto>()
                    .From<PeekPropertyObservationDto>()
                    .Where<PeekPropertyObservationDto>(x =>
                        x.Day == row.Day &&
                        x.ContentTypeKey == row.ContentTypeKey &&
                        x.PropertyAlias == row.PropertyAlias &&
                        x.Culture == row.Culture));

            if (existing is null)
            {
                database.Insert(row);
                continue;
            }

            existing.ObservedCount += row.ObservedCount;
            existing.RenderedCount += row.RenderedCount;
            existing.UnmatchableCount += row.UnmatchableCount;
            existing.EmptyCount += row.EmptyCount;
            existing.ContentTypeAlias = row.ContentTypeAlias;
            database.Update(existing);
        }
    }

    private static void PersistRenderLocations(IUmbracoDatabase database, PeekObservationSnapshot snapshot)
    {
        var locations = new Dictionary<(Guid TypeKey, string Property, string Culture, Guid NodeKey), PeekRenderLocationDto>();

        foreach (var observation in snapshot.Observations)
        {
            foreach (var outcome in observation.Properties)
            {
                if (outcome.State is not (PeekMatchState.Rendered or PeekMatchState.Ambiguous))
                {
                    continue;
                }

                var key = (outcome.ContentTypeKey, outcome.PropertyAlias, outcome.Culture, outcome.NodeKey);
                if (locations.TryGetValue(key, out var row) is false)
                {
                    row = new PeekRenderLocationDto
                    {
                        ContentTypeKey = outcome.ContentTypeKey,
                        PropertyAlias = outcome.PropertyAlias,
                        Culture = outcome.Culture,
                        NodeKey = outcome.NodeKey,
                        Url = observation.Url,
                        LastSeen = observation.ObservedAt,
                    };
                    locations[key] = row;
                }

                row.SeenCount++;
                row.LastSeen = observation.ObservedAt;
                row.Url = observation.Url;
            }
        }

        foreach (var row in locations.Values)
        {
            var existing = database.SingleOrDefault<PeekRenderLocationDto>(
                database.SqlContext.Sql()
                    .Select<PeekRenderLocationDto>()
                    .From<PeekRenderLocationDto>()
                    .Where<PeekRenderLocationDto>(x =>
                        x.ContentTypeKey == row.ContentTypeKey &&
                        x.PropertyAlias == row.PropertyAlias &&
                        x.Culture == row.Culture &&
                        x.NodeKey == row.NodeKey));

            if (existing is null)
            {
                database.Insert(row);
                continue;
            }

            existing.SeenCount += row.SeenCount;
            existing.LastSeen = row.LastSeen;
            existing.Url = row.Url;
            database.Update(existing);
        }
    }

    public Task PruneAsync(int retentionDays, CancellationToken cancellationToken)
    {
        var cutoff = DateTime.UtcNow.Date.AddDays(-retentionDays);

        using var scope = _scopeProvider.CreateScope();
        var database = scope.Database;

        database.Execute(
            database.SqlContext.Sql()
                .Delete<PeekPropertyObservationDto>()
                .Where<PeekPropertyObservationDto>(x => x.Day < cutoff));

        database.Execute(
            database.SqlContext.Sql()
                .Delete<PeekSampleDayDto>()
                .Where<PeekSampleDayDto>(x => x.Day < cutoff));

        database.Execute(
            database.SqlContext.Sql()
                .Delete<PeekRenderLocationDto>()
                .Where<PeekRenderLocationDto>(x => x.LastSeen < cutoff));

        scope.Complete();
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<PeekPropertyObservationDto>> GetPropertyObservationsAsync(Guid? contentTypeKey)
    {
        using var scope = _scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.Database.SqlContext.Sql()
            .Select<PeekPropertyObservationDto>()
            .From<PeekPropertyObservationDto>();

        if (contentTypeKey is not null)
        {
            sql = sql.Where<PeekPropertyObservationDto>(x => x.ContentTypeKey == contentTypeKey.Value);
        }

        IReadOnlyList<PeekPropertyObservationDto> rows = scope.Database.Fetch<PeekPropertyObservationDto>(sql);
        return Task.FromResult(rows);
    }

    public Task<IReadOnlyList<PeekRenderLocationDto>> GetRenderLocationsAsync(
        Guid contentTypeKey,
        string propertyAlias,
        string? culture)
    {
        using var scope = _scopeProvider.CreateScope(autoComplete: true);

        var sql = scope.Database.SqlContext.Sql()
            .Select<PeekRenderLocationDto>()
            .From<PeekRenderLocationDto>()
            .Where<PeekRenderLocationDto>(x =>
                x.ContentTypeKey == contentTypeKey && x.PropertyAlias == propertyAlias);

        if (string.IsNullOrEmpty(culture) is false)
        {
            sql = sql.Where<PeekRenderLocationDto>(x => x.Culture == culture);
        }

        IReadOnlyList<PeekRenderLocationDto> rows = scope.Database.Fetch<PeekRenderLocationDto>(sql);
        return Task.FromResult(rows);
    }

    public Task<IReadOnlyList<PeekSampleDayDto>> GetSampleDaysAsync()
    {
        using var scope = _scopeProvider.CreateScope(autoComplete: true);

        IReadOnlyList<PeekSampleDayDto> rows = scope.Database.Fetch<PeekSampleDayDto>(
            scope.Database.SqlContext.Sql().Select<PeekSampleDayDto>().From<PeekSampleDayDto>());

        return Task.FromResult(rows);
    }
}
