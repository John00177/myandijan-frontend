import { Helmet } from "react-helmet-async";
import { absoluteUrl } from "../../lib/seo";

/** Everything JSON.stringify accepts, with no `any` escape hatch. */
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface PostalAddressInput {
  addressLocality?: string | null;
  /** Defaults to "Andijon Region" — every listing in this directory is in it. */
  addressRegion?: string | null;
  streetAddress?: string | null;
}

export interface GeoInput {
  lat: number;
  lng: number;
}

export interface OpeningHoursInput {
  /** 0 = Monday … 6 = Sunday, matching the owner dashboard's day ordering. */
  day: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

export interface LocalBusinessInput {
  name: string;
  description?: string | null;
  image?: string | null;
  url?: string | null;
  telephone?: string | null;
  address?: PostalAddressInput | null;
  geo?: GeoInput | null;
  openingHours?: OpeningHoursInput[] | null;
  ratingValue?: number | null;
  reviewCount?: number | null;
  /** Social profile / external URLs. */
  sameAs?: string[] | null;
}

export interface WebSiteInput {
  name: string;
  url: string;
  /** Base path of the search route, e.g. "/uz/search". */
  searchPath: string;
}

export interface BreadcrumbItemInput {
  name: string;
  /** Absolute URL or root-relative path. */
  item: string;
}

export interface BreadcrumbListInput {
  items: BreadcrumbItemInput[];
}

type JsonLdProps =
  | { type: "LocalBusiness"; data: LocalBusinessInput }
  | { type: "WebSite"; data: WebSiteInput }
  | { type: "BreadcrumbList"; data: BreadcrumbListInput };

const SCHEMA_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const DEFAULT_REGION = "Andijon Region";
const COUNTRY = "UZ";

function buildOpeningHours(hours: OpeningHoursInput[]): JsonValue[] {
  return hours
    .filter((h) => !h.isClosed && h.openTime && h.closeTime && h.day >= 0 && h.day < SCHEMA_DAYS.length)
    .map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: SCHEMA_DAYS[h.day],
      opens: h.openTime as string,
      closes: h.closeTime as string,
    }));
}

function buildLocalBusiness(data: LocalBusinessInput): JsonValue {
  const schema: { [key: string]: JsonValue } = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: data.name,
  };

  if (data.description) schema.description = data.description;
  if (data.image) schema.image = absoluteUrl(data.image);
  if (data.url) schema.url = absoluteUrl(data.url);
  if (data.telephone) schema.telephone = data.telephone;

  if (data.address) {
    const address: { [key: string]: JsonValue } = {
      "@type": "PostalAddress",
      addressRegion: data.address.addressRegion || DEFAULT_REGION,
      addressCountry: COUNTRY,
    };
    if (data.address.addressLocality) address.addressLocality = data.address.addressLocality;
    if (data.address.streetAddress) address.streetAddress = data.address.streetAddress;
    schema.address = address;
  }

  if (data.geo) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: data.geo.lat,
      longitude: data.geo.lng,
    };
  }

  if (data.openingHours?.length) {
    const spec = buildOpeningHours(data.openingHours);
    if (spec.length > 0) schema.openingHoursSpecification = spec;
  }

  // Google rejects — and flags as an error — an AggregateRating with no reviews
  // behind it, so this block stays out entirely until there is at least one.
  if (data.ratingValue != null && (data.reviewCount ?? 0) > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: data.ratingValue,
      reviewCount: data.reviewCount as number,
    };
  }

  if (data.sameAs?.length) schema.sameAs = data.sameAs;

  return schema;
}

function buildWebSite(data: WebSiteInput): JsonValue {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: data.name,
    url: absoluteUrl(data.url),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl(data.searchPath)}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

function buildBreadcrumbList(data: BreadcrumbListInput): JsonValue {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: data.items.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: absoluteUrl(entry.item),
    })),
  };
}

function buildSchema(props: JsonLdProps): JsonValue {
  switch (props.type) {
    case "LocalBusiness":
      return buildLocalBusiness(props.data);
    case "WebSite":
      return buildWebSite(props.data);
    case "BreadcrumbList":
      return buildBreadcrumbList(props.data);
  }
}

/**
 * Emits one JSON-LD block into <head>.
 *
 * The `type` discriminates `data`, so passing WebSite fields with
 * type="LocalBusiness" is a compile error rather than silently-invalid markup.
 */
export default function JsonLd(props: JsonLdProps) {
  const schema = buildSchema(props);

  return (
    <Helmet>
      {/* The `<` escape keeps a stray "</script>" inside API-sourced text from
          closing this tag early. */}
      <script type="application/ld+json">{JSON.stringify(schema).replace(/</g, "\\u003c")}</script>
    </Helmet>
  );
}
