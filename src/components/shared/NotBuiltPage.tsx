import { useParams } from 'react-router-dom';
import { AlertTriangle, Hammer } from 'lucide-react';
import { findRoute, type Route } from '@/src/app/routes';
import { EmptyState } from '@/src/components/feedback';
import { PageHeader } from '@/src/components/layout/primitives';

/**
 * The screen behind every nav entry that has no screen.
 *
 * It replaces a placeholder reading "Migrating to new router — coming soon",
 * which was not true of anything: nothing was migrating, and several of these
 * sections have no backend to migrate to.
 *
 * The distinction it draws is the point. `planned` means nothing exists and
 * nothing is claimed. `inert` means the endpoints answer and the tables are
 * there, but nothing invokes the logic — so if this screen *were* built today
 * it would render an empty table that reads as a clean bill of health. Saying
 * so plainly is the difference between "we checked and found nothing" and "no
 * one is checking".
 */
export function NotBuiltPage({ routeId }: { routeId?: string }) {
  const params = useParams();
  const id = routeId ?? params['*'] ?? '';
  const route = findRoute(id);

  if (!route) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Page not found"
        message="That address does not match any section of the console."
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title={route.label} subtitle={subtitleFor(route)} />
      <EmptyState
        variant="not-built"
        icon={route.status === 'inert' ? AlertTriangle : Hammer}
        title={route.status === 'inert' ? 'Connected, but not running' : 'Not built yet'}
        message={route.note ?? 'This section has not been built.'}
      />
    </div>
  );
}

function subtitleFor(route: Route): string {
  return route.status === 'inert'
    ? 'The data layer exists but nothing populates it'
    : 'This section has not been built';
}
