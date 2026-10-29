import { test, expect } from '@playwright/test';
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
      await expect(page.getByTestId('agenda-day')).toHaveCount(2);
      const entries = page.getByTestId('agenda-entry');
      await expect(entries).toHaveCount(3);

      // grouped by day, in date then time order
      const firstDay = [full, open].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      const order = [...firstDay, later];
      for (const [i, s] of order.entries()) {
        const entry = entries.nth(i);
        await expect(entry).toContainText(s.title);
        await expect(entry).toContainText(s.room.name);
        await expect(entry).toContainText(s.venue.shortName);
        await expect(entry).toContainText(s.speakers[0].name);
        await expect(entry.getByRole('link', { name: s.title })).toHaveAttribute('href', `/sessions/${s.id}`);
      }

      // Waitlisted on the queued one only
      await expect(page.getByTestId('agenda-waitlisted')).toHaveCount(1);
      await expect(entries.filter({ hasText: full.title }).getByTestId('agenda-waitlisted')).toBeVisible();
      await shotForPR(page, 'My Agenda grouped by day');

      // Remove: gone at once, no reload, and off the agenda
      await entries.filter({ hasText: later.title }).getByTestId('agenda-remove').click();
      await expect(entries).toHaveCount(2);
      await expect(page.getByTestId('agenda-day')).toHaveCount(1);
      const schedule = await (await request.get(`${API}/users/${lane.user}/schedule`)).json();
      expect(schedule.days.flatMap((d) => d.sessions).map((s) => s.id)).not.toContain(later.id);

      // Nothing left: the prompt to browse
      for (const s of firstDay) await entries.filter({ hasText: s.title }).getByTestId('agenda-remove').click();
      await expect(page.getByTestId('agenda-empty')).toBeVisible();
      await expect(page.getByTestId('agenda-empty').getByRole('link', { name: 'Browse the schedule' })).toHaveAttribute('href', '/schedule');
    } finally {
      for (const s of booked) await request.delete(`${API}/users/${lane.user}/reservations/${s.id}`);
    }
  });
});
