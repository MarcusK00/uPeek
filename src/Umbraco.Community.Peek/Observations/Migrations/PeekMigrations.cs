using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Scoping;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Migrations;
using Umbraco.Cms.Infrastructure.Migrations.Upgrade;
using Umbraco.Community.Peek.Observations.Persistence;
using Umbraco.Cms.Core.Migrations;
using Umbraco.Cms.Core.Events;

namespace Umbraco.Community.Peek.Observations.Migrations;

/// <summary>Creates the tables backing the usage report.</summary>
public sealed class PeekAddObservationTables : AsyncMigrationBase
{
    public PeekAddObservationTables(IMigrationContext context)
        : base(context)
    {
    }

    protected override Task MigrateAsync()
    {
        CreateIfMissing<PeekPropertyObservationDto>(PeekPropertyObservationDto.TableName);
        CreateIfMissing<PeekRenderLocationDto>(PeekRenderLocationDto.TableName);
        CreateIfMissing<PeekSampleDayDto>(PeekSampleDayDto.TableName);

        return Task.CompletedTask;
    }

    private void CreateIfMissing<TDto>(string tableName)
    {
        if (TableExists(tableName))
        {
            return;
        }

        Create.Table<TDto>().Do();
    }
}

/// <summary>The Peek migration plan. One plan per package, as Umbraco expects.</summary>
public sealed class PeekMigrationPlan : MigrationPlan
{
    public PeekMigrationPlan()
        : base(PeekConstants.PackageName)
    {
        From(string.Empty)
            .To<PeekAddObservationTables>("peek-1.0.0-observation-tables");
    }
}

/// <summary>
///     Runs the plan on application start. Peek's tables are additive and independent of Umbraco's
///     schema, so this is safe to run unattended on boot.
/// </summary>
public sealed class PeekMigrationHandler : INotificationAsyncHandler<UmbracoApplicationStartedNotification>
{
    private readonly ICoreScopeProvider _scopeProvider;
    private readonly IMigrationPlanExecutor _migrationPlanExecutor;
    private readonly IKeyValueService _keyValueService;
    private readonly IRuntimeState _runtimeState;
    private readonly ILogger<PeekMigrationHandler> _logger;

    public PeekMigrationHandler(
        ICoreScopeProvider scopeProvider,
        IMigrationPlanExecutor migrationPlanExecutor,
        IKeyValueService keyValueService,
        IRuntimeState runtimeState,
        ILogger<PeekMigrationHandler> logger)
    {
        _scopeProvider = scopeProvider;
        _migrationPlanExecutor = migrationPlanExecutor;
        _keyValueService = keyValueService;
        _runtimeState = runtimeState;
        _logger = logger;
    }

    public async Task HandleAsync(UmbracoApplicationStartedNotification notification, CancellationToken cancellationToken)
    {
        if (_runtimeState.Level < RuntimeLevel.Run)
        {
            // Mid-install or mid-upgrade. Umbraco will start us again once it is ready.
            return;
        }

        try
        {
            await new Upgrader(new PeekMigrationPlan())
                .ExecuteAsync(_migrationPlanExecutor, _scopeProvider, _keyValueService);
        }
        catch (Exception ex)
        {
            // A failed Peek migration must not stop the site booting. The reporting tier degrades
            // to "unavailable"; the inspector overlay does not use these tables at all.
            _logger.LogError(ex, "Peek could not run its migrations. Usage reporting will be unavailable.");
        }
    }
}
