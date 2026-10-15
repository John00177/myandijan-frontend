import { SearchX } from "lucide-react";
import type { ReactNode } from "react";
import EmptyState from "../ui/EmptyState";
import MetaTags from "./MetaTags";

interface NotFoundStateProps {
  title: string;
  body: string;
  /**
   * True for a CONFIRMED not-found (the API said 404, or the slug matches
   * nothing in an already-loaded list). False for a transient failure
   * (network, 5xx): that page may well exist, and telling a crawler that hit
   * a blip to drop it from the index would be worse than saying nothing —
   * so no head tags are emitted then, exactly as before Phase 16F.1.
   */
  noIndex: boolean;
  children?: ReactNode;
}

/**
 * Phase 16F.1: not-found states must never be indexable. The SPA answers 200
 * for every URL (vercel.json rewrites /(.*) → index.html), so a missing
 * business/category/district/event used to render "not found" with no robots
 * tag and the head left at index.html's homepage title — a soft 404 a crawler
 * could index. This renders the visible empty state and, when the absence is
 * confirmed, `noindex` head tags with a not-found title.
 */
export default function NotFoundState({ title, body, noIndex, children }: NotFoundStateProps) {
  return (
    <>
      {noIndex && <MetaTags title={`${title} — My Andijan`} description={body} noIndex />}
      <EmptyState icon={SearchX} title={title} body={body}>
        {children}
      </EmptyState>
    </>
  );
}
