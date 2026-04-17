/**
 * Returns a YYYY-MM-DD string in the **local** timezone.
 * This is intentionally NOT toISOString() which returns UTC.
 *
 * @param {Date} [date=new Date()]
 * @returns {string}  e.g. "2025-07-14"
 */
export function toLocalDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns the local date string for today offset by `offsetDays` days.
 * offsetDays = 0  → today
 * offsetDays = 1  → yesterday
 *
 * @param {number} offsetDays
 * @returns {string}
 */
export function localDateOffset(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return toLocalDateStr(d);
}

/**
 * Returns the start of the current week (Sunday 00:00:00 local time) as a Date.
 */
export function startOfCurrentWeek() {
  const now = new Date();
  const d = new Date(now);
  d.setDate(now.getDate() - now.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns true if `dueDateStr` (YYYY-MM-DD or ISO string) is in the past
 * relative to the start of today (local time).
 *
 * @param {string|null|undefined} dueDateStr
 * @returns {boolean}
 */
export function isOverdue(dueDateStr) {
  if (!dueDateStr) return false;
  const due = new Date(dueDateStr);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return due < todayStart;
}

/**
 * Returns the number of days until `dueDateStr` from today (local).
 * Negative means overdue.
 *
 * @param {string|null|undefined} dueDateStr
 * @returns {number|null}
 */
export function daysUntil(dueDateStr) {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return Math.ceil((due - todayStart) / 86_400_000);
}

/**
 * Calculates the current consecutive-day streak given:
 * - an array of local date strings (YYYY-MM-DD) that have activity
 *
 * Logic:
 *   - If today has activity, count backwards from today.
 *   - If today has NO activity but yesterday does, count backwards from yesterday
 *     (streak is still alive, just not yet updated today).
 *   - Otherwise streak = 0.
 *
 * @param {string[]} activeDateStrs  — unique local date strings with at least one activity
 * @returns {number}
 */
export function calcStreak(activeDateStrs) {
  const set = new Set(activeDateStrs);
  const today = localDateOffset(0);
  const yesterday = localDateOffset(1);

  let startOffset;
  if (set.has(today)) {
    startOffset = 0;
  } else if (set.has(yesterday)) {
    startOffset = 1;
  } else {
    return 0;
  }

  let streak = 0;
  for (let i = startOffset; i < 365; i++) {
    if (set.has(localDateOffset(i))) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Given a completed_at ISO string, returns true if it falls within
 * the current calendar week (Sunday–Saturday, local time).
 *
 * @param {string} completedAtISO
 * @returns {boolean}
 */
export function isThisWeek(completedAtISO) {
  const date = new Date(completedAtISO);
  return date >= startOfCurrentWeek();
}

/**
 * Parses a date string safely, preserving local timezone for date-only
 * strings (YYYY-MM-DD).
 *
 * The Problem: new Date("2026-04-16") is parsed as midnight UTC.
 * In BRT (UTC-3) that renders as 2026-04-15 — one day behind.
 *
 * Fix: date-only strings are split into parts and passed to the Date
 * constructor as numbers, which uses local time instead of UTC.
 * Full ISO strings with time/timezone info are parsed normally.
 *
 * @param {string} str
 * @returns {Date}
 */
function parseDateSafe(str) {
  // Match bare date: YYYY-MM-DD (no T, no Z, no offset)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d); // local midnight — no UTC shift
  }
  return new Date(str);
}

/**
 * Formats a date for display in pt-BR.
 *
 * Accepts a Date object, an ISO datetime string (e.g. Supabase created_at),
 * or a bare date string (YYYY-MM-DD). Bare date strings are parsed as local
 * midnight to avoid the UTC-offset-causes-wrong-day bug.
 *
 * @param {string|Date} date
 * @param {Intl.DateTimeFormatOptions} [opts]
 * @returns {string}
 */
export function formatDate(date, opts = { day: "2-digit", month: "2-digit" }) {
  const d = typeof date === "string" ? parseDateSafe(date) : date;
  return d.toLocaleDateString("pt-BR", opts);
}

/**
 * Formats a datetime for display in pt-BR.
 *
 * Same safe-parse behavior as formatDate for string inputs.
 */
export function formatDateTime(date) {
  const d = typeof date === "string" ? parseDateSafe(date) : date;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
