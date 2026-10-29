# My Agenda lists the sessions you've added

## What this changes
`/my-agenda` stops being a "coming soon" panel. It lists every session the current attendee holds a seat or waitlist place in, grouped under a heading per day (date order), each day in start-time order. An entry shows time range, title, speaker names, and room and venue, links to `/sessions/:id`, is labelled **Waitlisted** when queued, and has a **Remove** button. Removing takes it off the list at once. With nothing added the page shows an empty state with **Browse the schedule**.

## Where
- `src/pages/MyAgendaPage.jsx` — fetch `api.getSchedule(currentUserId)` with `useFetch`, keyed on the user; re-filter every day's sessions through `reservationFor(s.id)` (store is the source of truth, so a removed session leaves immediately), drop empty days, sort by `startsAt`. Entry markup is local to the page (the `SessionCard` row variant has no speakers). Remove calls `toggleSeat(s.id, s)` (existing release rules and promotion). Test ids: `agenda-day`, `agenda-entry`, `agenda-waitlisted`, `agenda-remove`, `agenda-empty`.
- `src/lib/format.js` — reuse `dayLabel`, `timeRange`; no change expected.
- `tests/home.spec.js` — the "blank canvas" test asserts `agenda-coming-soon`; rewrite it to assert the nav link and `/my-plan` redirect land on the page (heading, and `agenda-empty` for an attendee with nothing).
- `tests/agenda.spec.js` (new) — browser spec using `visit`, `laneFor`, `bookableFor`, `clearAgendaFor` from `tests/helpers.js`; add lanes `agenda.list` and `agenda.remove` to `LANES` (clean days for the attendee, per `tests/unit/lanes.test.js`). Waitlist case books into a full session found via the API as in `seats.waitlist`.
- `docs/context/agenda.md`, `docs/context/ui.md` — replace the placeholder description; CLAUDE.md "Deliberately unbuilt" My Agenda line.

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| Several sessions across more than one day are listed grouped by day in date/time order | book 3 sessions over 2 days via API; assert day headings and entry order | spec |
| Entry shows time, title, speakers, room and venue, links to the session | assert text of an entry and its `href` | spec |
| Waitlisted label on a queued session, absent on a confirmed one | book a full session (waitlist) plus a free one; `agenda-waitlisted` count is 1 | spec |
| Remove takes it off at once, and it is off the agenda | click Remove; entry gone without reload; API schedule no longer holds it | spec |
| Nothing added shows Browse the schedule | clean-day attendee with no reservations sees `agenda-empty` with the link | spec |

All five are false on main, where the page renders only the placeholder.

## Decisions
- Show an ended session (Day 1 morning) on the list with a Remove button like any other, rather than hiding Remove — OK?
- Show every day's entries from a single fetch of `/schedule` and re-filter client-side, rather than reading reservations from the store alone (which lacks times, rooms and speakers) — OK?

## Out of scope
`.ics` export, booked-hours totals, clash warnings.
