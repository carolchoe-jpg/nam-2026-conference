import { Link } from 'react-router-dom';
import { useConference, useFetch } from '../lib/store.jsx';
import * as api from '../lib/api.js';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { agendaDays, dayLabel, timeRange } from '../lib/format.js';
import { Button, Chip, EmptyState, ErrorState, SectionHeader, Skeleton } from '../components/ui.jsx';

/**
 * Every session you hold a seat or a waitlist place in. The schedule is
 * fetched once; what is shown is re-filtered through the store, so Remove
 * takes an entry off the page without a refetch.
 */
export function MyAgendaPage() {
  useDocumentTitle('My Agenda');
  const { currentUserId, reservationFor, toggleSeat } = useConference();
  const { data, loading, error, reload } = useFetch(() => api.getSchedule(currentUserId), [currentUserId]);

  const days = data ? agendaDays(data.days, reservationFor) : [];

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Your conference" title="My Agenda" />
      {loading && !data ? (
        <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : days.length === 0 ? (
        <div data-testid="agenda-empty">
          <EmptyState
            icon="ticket"
            title="Nothing on your agenda yet"
            description="Add a session and it will show up here."
            action={<Button to="/schedule" size="sm">Browse the schedule</Button>}
          />
        </div>
      ) : (
        days.map((d) => (
          <section key={d.date} className="space-y-3" data-testid="agenda-day">
            <h2 className="font-display text-xl">{dayLabel(d.date)}</h2>
            <ul className="space-y-3">
              {d.sessions.map((s) => (
                <li key={s.id} className="card flex flex-wrap items-center gap-x-4 gap-y-3 p-4" data-testid="agenda-entry">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-xs text-muted">{timeRange(s.startsAt, s.endsAt)}</div>
                    <Link to={`/sessions/${s.id}`} className="block font-medium hover:underline">{s.title}</Link>
                    {s.speakers?.length > 0 && (
                      <div className="text-sm text-muted">{s.speakers.map((p) => p.name).join(', ')}</div>
                    )}
                    <div className="text-sm text-faint">{s.room.name} · {s.venue.shortName}</div>
                  </div>
                  {s.reservation === 'waitlisted' && <Chip data-testid="agenda-waitlisted">Waitlisted</Chip>}
                  <Button size="sm" onClick={() => toggleSeat(s.id, s)} data-testid="agenda-remove">Remove</Button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
