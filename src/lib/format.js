/** Shared display helpers. Keep formatting out of components. */

export const time = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
};

export const timeRange = (start, end) => `${time(start)} – ${time(end)}`;

export const dayLabel = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC',
  });

export const shortDay = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short', timeZone: 'UTC',
  });

/**
 * "12m ago" measured against the conference clock, not the browser's.
 * Seeded timestamps are conference-local wall time with a Z suffix, so the
 * clock is compared on that same basis.
 */
export const relativeDate = (iso, clock) => {
  const d = new Date(iso);
  const diff = (new Date(`${clock.day}T${clock.time}:00Z`).getTime() - d.getTime()) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const plural = (n, one, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

/** The schedule rail's "N sessions · M today"/"M on Day 1" line. `dayPhrase` is the caller's job. */
export const agendaSummary = (total, bookedOnDay, dayPhrase) =>
  `${total === 1 ? 'session' : 'sessions'} · ${bookedOnDay} ${dayPhrase}`;

/**
 * What My Agenda shows: the fetched schedule re-filtered through the store's
 * own reservation state (a removed session leaves at once), each session
 * carrying the store's status, days in date order and sessions in start order.
 */
export const agendaDays = (days, reservationFor) =>
  days
    .map((d) => ({
      ...d,
      sessions: d.sessions
        .filter((s) => reservationFor(s.id))
        .map((s) => ({ ...s, reservation: reservationFor(s.id) }))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id - b.id),
    }))
    .filter((d) => d.sessions.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
