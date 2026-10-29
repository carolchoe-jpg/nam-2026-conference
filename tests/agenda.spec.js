import { test, expect } from '@playwright/test';
import { dayLabel } from '../src/lib/format.js';
import { API, visit, momentOn, laneFor, bookableFor, clearAgendaFor, conferenceDays, shotForPR } from './helpers.js';

test.describe('My Agenda', () => {
  test('lists what you added by day, labels the waitlist, removes at once, and invites you to browse when empty', async ({ page, request }, testInfo) => {
    const lane = await laneFor('agenda.list', testInfo);
    const day2 = (await conferenceDays())[lane.day2];

    await clearAgendaFor(request, lane.user, lane.day);
    const put = (id) => request.put(`${API}/users/${lane.user}/reservations/${id}`);
    const free = await bookableFor(request, lane.user, lane.day);
    const full = free.find((s) => s.isFull);
    expect(full, 'no full session to queue for').toBeTruthy();
    const open = free.filter((s) => !s.isFull && s.seatsLeft > 3 && s.startsAt !== full.startsAt)[0];
    const later = (await bookableFor(request, lane.user, day2))
      .find((s) => s.startsAt === lane.slot2 && s.seatsLeft > 3);
    expect(later, `no open session at ${lane.slot2}`).toBeTruthy();
    const booked = [full, open, later];

    try {
      for (const s of booked) expect((await put(s.id)).ok()).toBeTruthy();

      await visit(page, '/my-agenda', { as: lane.user, at: await momentOn(0, '07:00') });
      const entries = page.getByTestId('agenda-entry');
      const mine = (s) => entries.filter({ hasText: s.title });
      await expect(mine(later)).toHaveCount(1);

      // grouped by day, in date then time order: the attendee's seeded plan shares the page,
      // so look at where our three fall in the whole list
      const firstDay = [full, open].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      const order = [...firstDay, later];
      const titles = await entries.locator('a').allInnerTexts();
      const at = order.map((s) => titles.indexOf(s.title));
      expect(at.every((i) => i >= 0) && at.every((i, n) => n === 0 || i > at[n - 1]), `order ${at}`).toBeTruthy();
      await expect(page.getByTestId('agenda-day').filter({ has: mine(full) })).toContainText(dayLabel(lane.day));
      await expect(page.getByTestId('agenda-day').filter({ has: mine(later) })).toContainText(dayLabel(day2));
      await expect(page.getByTestId('agenda-day').filter({ has: mine(open) })).toHaveCount(1);

      for (const s of order) {
        const entry = mine(s);
        await expect(entry).toContainText(s.room.name);
        await expect(entry).toContainText(s.venue.shortName);
        await expect(entry).toContainText(s.speakers[0].name);
        await expect(entry.getByRole('link', { name: s.title })).toHaveAttribute('href', `/sessions/${s.id}`);
      }

      // Waitlisted on the queued one only
      await expect(mine(full).getByTestId('agenda-waitlisted')).toBeVisible();
      await expect(mine(open).getByTestId('agenda-waitlisted')).toHaveCount(0);
      await expect(mine(later).getByTestId('agenda-waitlisted')).toHaveCount(0);
      await shotForPR(page, 'My Agenda grouped by day');

      // Remove: gone at once, no reload, and off the agenda
      await mine(later).getByTestId('agenda-remove').click();
      await expect(mine(later)).toHaveCount(0);
      const schedule = await (await request.get(`${API}/users/${lane.user}/schedule`)).json();
      expect(schedule.days.flatMap((d) => d.sessions).map((s) => s.id)).not.toContain(later.id);

      // Nothing to show: the prompt to browse
      await page.route('**/api/users/*/schedule', (route) =>
        route.fulfill({ json: { user: schedule.user, days: [] } }));
      await page.reload();
      await expect(page.getByTestId('agenda-empty').getByRole('link', { name: 'Browse the schedule' })).toHaveAttribute('href', '/schedule');
      await expect(entries).toHaveCount(0);
    } finally {
      for (const s of booked) await request.delete(`${API}/users/${lane.user}/reservations/${s.id}`);
    }
  });
});
