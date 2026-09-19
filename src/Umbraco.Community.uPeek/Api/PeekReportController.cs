using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Community.uPeek.Reporting;
using Umbraco.Community.uPeek.Reporting.Models;

namespace Umbraco.Community.uPeek.Api;

/// <summary>Backoffice reporting endpoints. One controller, because they share one service.</summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = PeekConstants.PackageName)]
public sealed class PeekReportController : PeekManagementApiControllerBase
{
    private readonly IPeekReportService _reportService;

    public PeekReportController(IPeekReportService reportService) => _reportService = reportService;

    /// <summary>
    ///     Whether uPeek has seen enough traffic to be believed. Every report surface calls this
    ///     first and refuses to draw conclusions when it says no.
    /// </summary>
    [HttpGet("status")]
    [ProducesResponseType<PeekSamplingStatus>(StatusCodes.Status200OK)]
    public async Task<PeekSamplingStatus> Status() => await _reportService.GetSamplingStatusAsync();

    /// <summary>
    ///     Per-property usage for one document type. This is the killer placement: you are staring
    ///     at seoKeywords in the doctype editor and the tab tells you it has never rendered.
    /// </summary>
    [HttpGet("document-type/{key:guid}/usage")]
    [ProducesResponseType<PeekDocumentTypeUsage>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PeekDocumentTypeUsage>> DocumentTypeUsage(Guid key)
    {
        var usage = await _reportService.GetDocumentTypeUsageAsync(key);
        return usage is null ? NotFound() : Ok(usage);
    }

    /// <summary>Answers "can I delete this?" at the exact moment somebody is about to.</summary>
    [HttpGet("media/{key:guid}/usage")]
    [ProducesResponseType<PeekMediaUsage>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PeekMediaUsage>> MediaUsage(Guid key)
    {
        var usage = await _reportService.GetMediaUsageAsync(key);
        return usage is null ? NotFound() : Ok(usage);
    }

    /// <summary>Site-wide: every property, ranked by how dead it looks.</summary>
    [HttpGet("report/orphans")]
    [ProducesResponseType<PeekOrphanReport>(StatusCodes.Status200OK)]
    public async Task<PeekOrphanReport> Orphans() => await _reportService.GetOrphanReportAsync();

    /// <summary>
    ///     The inverse lookup: pick a property, get every URL where it was observed rendering.
    ///     "Can I safely delete this?" answered in the other direction.
    /// </summary>
    [HttpGet("report/reverse-lookup")]
    [ProducesResponseType<PeekReverseLookup>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PeekReverseLookup>> ReverseLookup(
        [FromQuery] Guid contentTypeKey,
        [FromQuery] string propertyAlias,
        [FromQuery] string? culture = null)
    {
        if (string.IsNullOrWhiteSpace(propertyAlias))
        {
            return BadRequest("A propertyAlias is required.");
        }

        var result = await _reportService.GetReverseLookupAsync(contentTypeKey, propertyAlias, culture);
        return result is null ? NotFound() : Ok(result);
    }
}
