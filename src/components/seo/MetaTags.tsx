import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { SUPPORTED_LANGS, useLanguage } from "../../contexts/LanguageContext";
import { absoluteUrl, DEFAULT_OG_IMAGE, OG_LOCALE, pathForLang, SITE_NAME, SITE_URL } from "../../lib/seo";

interface MetaTagsProps {
  title: string;
  description: string;
  /** Absolute URL or root-relative path. Falls back to the static site-wide OG card. */
  image?: string | null;
  type?: "website" | "article" | "profile";
  /** Set on authenticated/private routes so they stay out of the index. */
  noIndex?: boolean;
}

/**
 * Head tags for a route: title, description, canonical, hreflang alternates,
 * Open Graph and Twitter cards.
 *
 * Callers only pass what is page-specific — the language-derived parts
 * (canonical, alternates, og:locale) come from the router, so every page gets
 * them without opting in. Safe to use anywhere under LangShell, which is where
 * all routes live.
 *
 * Note: no React fragments inside <Helmet> — react-helmet-async only accepts
 * plain elements and arrays as children.
 */
export default function MetaTags({ title, description, image, type = "website", noIndex = false }: MetaTagsProps) {
  const { lang } = useLanguage();
  const { pathname } = useLocation();

  const canonical = `${SITE_URL}${pathForLang(pathname, lang)}`;
  const ogImage = absoluteUrl(image || DEFAULT_OG_IMAGE);

  return (
    <Helmet>
      <html lang={lang} />
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* A noindex page gets no canonical and no hreflang alternates (Phase
          16F.1): canonical + noindex are contradictory signals, and the
          alternates would advertise language versions of a private route or
          of a URL that does not exist. */}
      {noIndex ? <meta name="robots" content="noindex, nofollow" /> : <link rel="canonical" href={canonical} />}

      {noIndex
        ? null
        : SUPPORTED_LANGS.map((alt) => (
            <link key={alt} rel="alternate" hrefLang={alt} href={`${SITE_URL}${pathForLang(pathname, alt)}`} />
          ))}
      {noIndex ? null : (
        <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}${pathForLang(pathname, "uz")}`} />
      )}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content={OG_LOCALE[lang]} />
      {SUPPORTED_LANGS.filter((alt) => alt !== lang).map((alt) => (
        <meta key={alt} property="og:locale:alternate" content={OG_LOCALE[alt]} />
      ))}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
