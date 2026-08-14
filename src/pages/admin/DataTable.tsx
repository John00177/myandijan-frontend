import type { ReactNode } from "react";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import { Inbox } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Omit this column from the stacked mobile card. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyOf: (row: T) => string | number;
  loading?: boolean;
  emptyTitle: string;
  emptyBody?: string;
  /** Rendered above the mobile card's field list — usually the row's title + actions. */
  mobileHeader?: (row: T) => ReactNode;
}

/**
 * One table, two layouts: a real <table> on desktop and stacked label/value
 * cards under sm. Written generically so Businesses, Users and Audit logs share
 * it instead of each hand-rolling responsive table markup.
 */
export default function DataTable<T>({
  columns,
  rows,
  keyOf,
  loading = false,
  emptyTitle,
  emptyBody,
  mobileHeader,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState icon={Inbox} title={emptyTitle} body={emptyBody ?? ""} />;
  }

  return (
    <>
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-muted text-xs uppercase tracking-wider">
              {columns.map((col) => (
                <th key={col.key} className="py-3 pr-4 font-medium whitespace-nowrap">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={keyOf(row)} className="border-t border-white/[0.06] hover:bg-white/[0.02]">
                {columns.map((col) => (
                  <td key={col.key} className="py-3 pr-4 align-middle">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden flex flex-col gap-3">
        {rows.map((row) => (
          <div key={keyOf(row)} className="p-4 bg-card border border-white/[0.08] rounded-xl">
            {mobileHeader?.(row)}
            <div className="flex flex-col gap-1.5 mt-2">
              {columns
                .filter((col) => !col.hideOnMobile)
                .map((col) => (
                  <div key={col.key} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-ink-muted shrink-0">{col.header}</span>
                    <span className="text-sm text-ink-body text-right min-w-0">{col.render(row)}</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
