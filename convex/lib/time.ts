// All reset boundaries are UTC: daily flips at 00:00Z, weekly at Monday 00:00Z,
// monthly at the 1st 00:00Z. Week keys follow ISO-8601 (Monday-start,
// Thursday-anchored) so late-December dates can land in week 01 of the next
// year. Keys returned here are used verbatim as cadenceKey on questProgress
// and dateKey on dailyUsage; changing the format invalidates existing rows.

export function now(): number {
  return Date.now();
}

export function dayKeyUTC(ts: number): string {
  const d = new Date(ts);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** ISO-8601 week key (Monday-start, Thursday-anchored) in UTC. */
export function weekKeyUTC(ts: number): string {
  const d = new Date(ts);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const weekNum =
    1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${target.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export function monthKeyUTC(ts: number): string {
  const d = new Date(ts);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function msUntilNextDailyResetUTC(ts: number): number {
  const d = new Date(ts);
  const next = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
  return Math.max(0, next - ts);
}

/** Milliseconds until the next UTC Monday 00:00. */
export function msUntilNextWeeklyResetUTC(ts: number): number {
  const d = new Date(ts);
  const day = d.getUTCDay();
  const daysUntilMonday = ((8 - day) % 7) || 7;
  const next = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + daysUntilMonday,
    0,
    0,
    0,
    0,
  );
  return Math.max(0, next - ts);
}
