using Umbraco.Cms.Api.Common.OpenApi;
using Umbraco.Cms.Api.Management.OpenApi;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace Umbraco.Community.Peek.Composing;

/// <summary>
///     Registers a dedicated OpenAPI document for Peek's Management API, so the TypeScript client
///     can be regenerated with <c>npm run generate-client</c> against a running site.
/// </summary>
public sealed class PeekOpenApiComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
        => builder.AddBackOfficeOpenApiDocument(
            PeekConstants.ApiName,
            document => document
                .WithTitle("Peek Backoffice API")
                .WithBackOfficeAuthentication()
                .WithJsonOptions(Umbraco.Cms.Core.Constants.JsonOptionsNames.BackOffice)
                .ConfigureOpenApiOptions(options =>
                    options.AddDocumentTransformer((doc, _, _) =>
                    {
                        doc.Info.Version = "1.0";
                        doc.Info.Description =
                            "Usage reporting for Peek: which content properties actually reach a page.";
                        return Task.CompletedTask;
                    })));
}
