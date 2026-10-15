import type { HourFormRow } from "../../components/business/EditBusinessModal";

export interface AdminHourInput {
  dayOfWeek: number;
  openTime?: string;
  closeTime?: string;
  isClosed?: boolean;
  is24Hours?: boolean;
}

/**
 * What the admin edit flow sends to PUT /admin/businesses/:id/hours — or
 * null to send nothing (Phase 16E data-integrity fix).
 *
 * That endpoint deletes every hour row on the primary branch and inserts
 * exactly the rows it receives (replacePrimaryBranchHours): a day left out
 * ends with no row, and an omitted `is24Hours` becomes false. So:
 *
 * - Hours not loaded (GET /businesses/:id 404s for any non-APPROVED listing)
 *   → null. The grid is the 09:00–18:00 placeholder, not the business's data.
 * - Nothing edited → null. The stored rows stay exactly as they are.
 * - Something edited → every stored day, plus the days actually edited. An
 *   untouched stored day is re-sent verbatim, `is24Hours` included; a day
 *   that had no row and was not edited stays without one, rather than
 *   becoming a placeholder 09:00–18:00. An edited day is the explicit hours
 *   (or closed) the admin set, so it is no longer a 24-hour day.
 */
export function adminHoursPayload(rows: HourFormRow[], hoursLoaded: boolean): AdminHourInput[] | null {
  if (!hoursLoaded) return null;
  if (!rows.some((row) => row.touched)) return null;

  return rows
    .filter((row) => row.original || row.touched)
    .map((row) => {
      if (row.original && !row.touched) {
        return {
          dayOfWeek: row.dayOfWeek,
          openTime: row.original.openTime ?? undefined,
          closeTime: row.original.closeTime ?? undefined,
          isClosed: row.original.isClosed,
          is24Hours: row.original.is24Hours ?? false,
        };
      }
      return {
        dayOfWeek: row.dayOfWeek,
        openTime: row.isClosed ? undefined : row.openTime,
        closeTime: row.isClosed ? undefined : row.closeTime,
        isClosed: row.isClosed,
        is24Hours: false,
      };
    });
}
