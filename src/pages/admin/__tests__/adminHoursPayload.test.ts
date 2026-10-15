import { describe, expect, it } from "vitest";
import type { HourFormRow } from "../../../components/business/EditBusinessModal";
import { adminHoursPayload } from "../adminHoursPayload";

/** A 7-day grid as EditBusinessModal builds it: placeholder 09:00–18:00 unless loaded. */
function grid(overrides: Partial<Record<number, Partial<HourFormRow>>> = {}): HourFormRow[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    openTime: "09:00",
    closeTime: "18:00",
    isClosed: false,
    ...overrides[dayOfWeek],
  }));
}

const monday = { dayOfWeek: 0, openTime: "10:00", closeTime: "20:00", isClosed: false, is24Hours: false };
const tuesday24h = { dayOfWeek: 1, openTime: null, closeTime: null, isClosed: false, is24Hours: true };
const sundayClosed = { dayOfWeek: 6, openTime: null, closeTime: null, isClosed: true, is24Hours: false };

/** Loaded state: Mon 10–20, Tue 24h, Sun closed, Wed–Sat with no stored row. */
function loadedGrid(extra: Partial<Record<number, Partial<HourFormRow>>> = {}): HourFormRow[] {
  return grid({
    0: { openTime: "10:00", closeTime: "20:00", original: monday, ...extra[0] },
    1: { original: tuesday24h, ...extra[1] },
    6: { isClosed: true, original: sundayClosed, ...extra[6] },
    ...Object.fromEntries(Object.entries(extra).filter(([day]) => !["0", "1", "6"].includes(day))),
  });
}

describe("adminHoursPayload", () => {
  it("sends nothing when the real hours could not be loaded, even if the placeholder grid was edited", () => {
    expect(adminHoursPayload(grid(), false)).toBeNull();
    expect(adminHoursPayload(grid({ 0: { closeTime: "23:00", touched: true } }), false)).toBeNull();
  });

  it("sends nothing when the loaded hours were not edited, leaving the stored rows as they are", () => {
    expect(adminHoursPayload(loadedGrid(), true)).toBeNull();
  });

  it("re-sends untouched stored days verbatim, keeping a 24-hour day 24-hour", () => {
    const payload = adminHoursPayload(loadedGrid({ 0: { closeTime: "22:00", touched: true } }), true);

    expect(payload).toEqual([
      { dayOfWeek: 0, openTime: "10:00", closeTime: "22:00", isClosed: false, is24Hours: false },
      { dayOfWeek: 1, openTime: undefined, closeTime: undefined, isClosed: false, is24Hours: true },
      { dayOfWeek: 6, openTime: undefined, closeTime: undefined, isClosed: true, is24Hours: false },
    ]);
  });

  it("never turns a day with no stored row into a placeholder 09:00–18:00 day", () => {
    const payload = adminHoursPayload(loadedGrid({ 0: { closeTime: "22:00", touched: true } }), true)!;

    expect(payload.map((row) => row.dayOfWeek)).toEqual([0, 1, 6]);
    expect(payload).not.toContainEqual(expect.objectContaining({ openTime: "09:00", closeTime: "18:00" }));
  });

  it("includes a day that had no row only once the admin actually sets it", () => {
    const payload = adminHoursPayload(loadedGrid({ 3: { openTime: "08:00", closeTime: "17:00", touched: true } }), true)!;

    expect(payload).toContainEqual({ dayOfWeek: 3, openTime: "08:00", closeTime: "17:00", isClosed: false, is24Hours: false });
    expect(payload.map((row) => row.dayOfWeek)).toEqual([0, 1, 3, 6]);
  });

  it("treats an edited 24-hour day as the explicit hours the admin set", () => {
    const payload = adminHoursPayload(loadedGrid({ 1: { isClosed: true, touched: true } }), true)!;

    expect(payload).toContainEqual({ dayOfWeek: 1, openTime: undefined, closeTime: undefined, isClosed: true, is24Hours: false });
  });
});
