using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Extensions;

namespace uPeek.TestSite.Demo;

/// <summary>Registers the demo content installer. Test site only — nothing here ships.</summary>
public sealed class PeekDemoComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
        => builder.AddNotificationAsyncHandler<UmbracoApplicationStartedNotification, PeekDemoInstaller>();
}
