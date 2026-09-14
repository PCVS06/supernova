import type {CuratorQuietHours} from "@supernova/contracts/harnesses/schemas";

const minutesPerDay = 24 * 60;
/** The wall-clock format the daily sweep and the quiet window are configured in. */
export const clockPattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "HH:MM" as minutes since local midnight, or nothing when it is not a time of day. */
export function clockMinutes(value: string): number | undefined {
  const match = clockPattern.exec(value.trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : undefined;
}

function minutesOfDay(at: Date): number {
  return at.getHours() * 60 + at.getMinutes();
}

/**
 * The most recent moment the sweep was due: today's configured time, or yesterday's when it has not come round yet.
 *
 * A due moment rather than a calendar day, because a sweep configured inside the quiet window is postponed past
 * midnight, and "has today's sweep run" would then lose it every night. A malformed time is never due.
 */
export function lastScheduledSweep(dailyAt: string, at: Date): Date | undefined {
  const due = clockMinutes(dailyAt);
  if (due === undefined) return undefined;
  const moment = new Date(at.getFullYear(), at.getMonth(), at.getDate(), Math.floor(due / 60), due % 60, 0, 0);
  if (moment.getTime() > at.getTime()) moment.setDate(moment.getDate() - 1);
  return moment;
}

/** Whether a review would start inside the quiet window. A window whose ends are equal is no window at all. */
export function inQuietHours(quiet: CuratorQuietHours | undefined, at: Date): boolean {
  if (!quiet) return false;
  const from = clockMinutes(quiet.from);
  const to = clockMinutes(quiet.to);
  if (from === undefined || to === undefined || from === to) return false;
  const now = minutesOfDay(at);
  // A window that crosses midnight is the complement of the window that does not.
  return from < to ? now >= from && now < to : now >= from || now < to;
}

/** How long a postponed review has to wait for the quiet window to end; zero when it is not inside one. */
export function quietHoursEndsInMs(quiet: CuratorQuietHours | undefined, at: Date): number {
  if (!inQuietHours(quiet, at)) return 0;
  const to = clockMinutes(quiet!.to)!;
  const minutes = (to - minutesOfDay(at) + minutesPerDay) % minutesPerDay;
  return minutes * 60_000 - at.getSeconds() * 1000 - at.getMilliseconds();
}
