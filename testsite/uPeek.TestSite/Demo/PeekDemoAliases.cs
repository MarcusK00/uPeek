namespace uPeek.TestSite.Demo;

/// <summary>
///     Aliases for the demo content model, in one place so the installer and the Razor views cannot
///     drift apart.
/// </summary>
public static class PeekDemoAliases
{
    public const string DemoLanguage = "da-DK";

    public static class DocumentTypes
    {
        public const string HomePage = "peekHomePage";
        public const string LandingPage = "peekLandingPage";
        public const string SharedContent = "peekSharedContent";
    }

    public static class ElementTypes
    {
        public const string HeroBlock = "peekHeroBlock";
        public const string TextBlock = "peekTextBlock";
        public const string CallToActionBlock = "peekCtaBlock";
    }

    public static class Properties
    {
        public const string PageTitle = "pageTitle";
        public const string Introduction = "introduction";
        public const string ContentBlocks = "contentBlocks";
        public const string SharedFooter = "sharedFooter";

        /// <summary>
        ///     The demo's whole point. Editors fill it in on every page and no template ever renders
        ///     it, which is precisely what uPeek's usage report is built to find.
        /// </summary>
        public const string SeoKeywords = "seoKeywords";

        public const string Heading = "heading";
        public const string Subheading = "subheading";
        public const string Title = "title";
        public const string BodyText = "bodyText";
        public const string Label = "label";
        public const string Link = "link";

        public const string FooterText = "footerText";
        public const string ContactEmail = "contactEmail";
    }

    public static class DataTypes
    {
        public const string DemoBlockList = "uPeek Demo Blocks";
    }
}
