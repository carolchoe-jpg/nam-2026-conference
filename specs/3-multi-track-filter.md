# Filter the schedule by more than one track at once

## What this changes
The track pills in the `/schedule` filter rail become multi-select. Clicking a pill toggles that track; each pill exposes `aria-pressed`. "All" clears the selection. The selection lives in the URL as one comma-separated key (`?track=a,b`) and reaches the API as `trackSlug=a,b`, so a list shows the sessions of every selected track. Any selection, one or several, still forces list view and disables the Grid tab with the existing notice. A one-track link behaves as today.

## Where
- `server/routes/sessions.js` — the `trackSlug` line (~38): split on `,`, drop empties, build `t.slug IN (?, ?)`; one value yields the same rows as `t.slug = ?`. Test in `tests/api/endpoints.test.js` using the `ids.track` fixture plus a second track slug from `/bootstrap`: two slugs return the union, one slug is unchanged.
- `src/pages/SchedulePage.jsx` — `filters.track` stays the raw comma string (so `useFetch` deps, `activeKeys`, `BLOCKERS` and `api.getSessions`' `trackSlug` need no change). Add a derived `selectedTracks = filters.track === ALL ? [] : filters.track.split(',')`. The pill `onClick` toggles one slug in that list and calls `set('track', list.join(','))` (empty list deletes the key via `set`). Each pill gets `aria-pressed={active}` with `active = selectedTracks.includes(t.slug)`; "All" is active when the list is empty and clears the key. `src/lib/api.js` `qs()` already passes the string through.
- `tests/schedule.spec.js` — new tests in the `Schedule` describe, using `visit`, `waitForResults`, `conferenceDays`, `API` from `tests/helpers.js`; on mobile click the `Filters` button first. Counts come from `/api/sessions?day=…&trackSlug=…` for the same day, with a day chosen so both tracks have sessions.
- `docs/context/schedule.md` — note track is multi-valued with `aria-pressed` pills, and the `IN` split.

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| Two tracks list both tracks' sessions, `result-count` matches API | click two pills, compare `result-count` to API count for `a,b` | spec |
| Deselecting one leaves the other, count matches API | click one pill off, compare to API count for the remaining track | spec |
| "All" restores the list and clears `track` from the URL | click All, `not.toHaveURL(/track=/)`, count equals unfiltered API count | spec |
| `/schedule?track=a,b` shows both selected; `?track=a` as today | visit both URLs, assert pills and count | spec |
| `aria-pressed` true/false | `toHaveAttribute('aria-pressed', …)` on selected and unselected pills | spec |
| Any selection forces list view, Grid tab disabled | assert Grid tab `toBeDisabled()` and notice with one and two tracks | spec |
| API accepts comma-separated slugs | `trackSlug=a,b` returns union of `a` and `b`; `trackSlug=a` equals today | API |
| Both add and remove, desktop and mobile | the above run in both Playwright projects | spec |

## Decisions
- Should a malformed value such as `?track=a,,b` or an unknown slug simply match nothing extra (empty parts ignored), rather than error?
- Should pill order in the URL follow click order rather than the tracks' display order?

## Out of scope
Topic, level and format stay single-choice; no other page changes.
