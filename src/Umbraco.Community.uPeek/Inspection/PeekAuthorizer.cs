using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Configuration.Models;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Services;
using Umbraco.Community.uPeek.Configuration;
using Constants = Umbraco.Cms.Core.Constants;

namespace Umbraco.Community.uPeek.Inspection;

/// <summary>Who, if anyone, is allowed to see uPeek information on this front-end request.</summary>
public interface IPeekAuthorizer
{
    /// <summary>
    ///     Returns the backoffice user behind this request, or null. Cheap to call on anonymous
    ///     requests: it short-circuits on the absence of the backoffice auth cookie before doing
    ///     any ticket decryption or database work.
    /// </summary>
    Task<PeekViewer?> AuthorizeAsync(HttpContext httpContext);
}

/// <summary>An authenticated backoffice user, as seen from the front end.</summary>
public sealed record PeekViewer(Guid Key, string? Name, IReadOnlyCollection<string> AllowedSections);

/// <inheritdoc />
public sealed class PeekAuthorizer : IPeekAuthorizer
{
    private readonly IUserService _userService;
    private readonly IOptionsMonitor<PeekOptions> _peekOptions;
    private readonly IOptionsMonitor<SecuritySettings> _securitySettings;
    private readonly ILogger<PeekAuthorizer> _logger;

    public PeekAuthorizer(
        IUserService userService,
        IOptionsMonitor<PeekOptions> peekOptions,
        IOptionsMonitor<SecuritySettings> securitySettings,
        ILogger<PeekAuthorizer> logger)
    {
        _userService = userService;
        _peekOptions = peekOptions;
        _securitySettings = securitySettings;
        _logger = logger;
    }

    public async Task<PeekViewer?> AuthorizeAsync(HttpContext httpContext)
    {
        var options = _peekOptions.CurrentValue;
        if (options.Enabled is false)
        {
            return null;
        }

        // The overwhelming majority of front-end requests are anonymous. Bail out on a dictionary
        // lookup rather than on ticket decryption, so installing uPeek costs an anonymous visitor
        // nothing measurable.
        if (HasBackOfficeCookie(httpContext) is false)
        {
            return null;
        }

        AuthenticateResult result;
        try
        {
            // The backoffice auth cookie is issued with Path=/, so it is present on front-end
            // requests too. This is the same mechanism backoffice preview relies on.
            result = await httpContext.AuthenticateAsync(Constants.Security.BackOfficeAuthenticationType);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "uPeek could not evaluate the backoffice authentication cookie.");
            return null;
        }

        if (result.Succeeded is false || result.Principal is null)
        {
            return null;
        }

        IUser? user;
        try
        {
            user = await ResolveUserAsync(result.Principal);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "uPeek could not load the backoffice user behind this request.");
            return null;
        }

        if (user is null)
        {
            return null;
        }

        var allowedSections = user.AllowedSections.ToArray();

        // The map leaks content structure, so gate on real section access rather than merely on
        // "has a backoffice session".
        var required = options.Inspector.RequiredSections;
        if (required.Length > 0 &&
            required.Any(section => allowedSections.Contains(section, StringComparer.OrdinalIgnoreCase)) is false)
        {
            return null;
        }

        return new PeekViewer(user.Key, user.Name, allowedSections);
    }

    private bool HasBackOfficeCookie(HttpContext httpContext)
    {
        var cookieName = _securitySettings.CurrentValue.AuthCookieName;
        return string.IsNullOrWhiteSpace(cookieName) is false &&
               httpContext.Request.Cookies.ContainsKey(cookieName);
    }

    /// <summary>
    ///     Resolves the backoffice user from the authenticated principal.
    /// </summary>
    /// <remarks>
    ///     Umbraco puts the integer user id in <see cref="ClaimTypes.NameIdentifier" /> and the Guid
    ///     key in the OpenIddict <c>sub</c> claim — the opposite way round from what the claim names
    ///     suggest. Both are read here: the key first, because it is the stable identifier, with the
    ///     integer id as a fallback for principals issued by an older ticket format.
    /// </remarks>
    private async Task<IUser?> ResolveUserAsync(ClaimsPrincipal principal)
    {
        var subject = principal.FindFirstValue(Constants.Security.OpenIdDictSubClaimType);
        if (Guid.TryParse(subject, out var key))
        {
            return await _userService.GetAsync(key);
        }

        var nameIdentifier = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(nameIdentifier, out var id))
        {
            return _userService.GetUserById(id);
        }

        return Guid.TryParse(nameIdentifier, out var fallbackKey)
            ? await _userService.GetAsync(fallbackKey)
            : null;
    }
}
