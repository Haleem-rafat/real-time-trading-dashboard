import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { AlertTriangle, Home, RefreshCcw } from 'lucide-react';
import { Button } from '@UI/index';
import { ERoutes } from '@constants/routes';

/**
 * Top-level error screen used as the router's `errorElement`. Renders
 * whenever a loader/action/render throws. Also caught by React Router's
 * built-in error boundary mechanism — this means any uncaught render
 * error in a routed component lands here instead of a blank page.
 *
 * Gives the user two ways out:
 *   - a "Reload" button that re-runs the page (useful for transient
 *     network / WebSocket failures)
 *   - a link back to the dashboard so they're never stranded
 *
 * Formats error responses from route loaders differently from thrown
 * JS Errors so the copy stays useful in both cases.
 */
function RouteErrorBoundary() {
  const error = useRouteError();

  let title = 'Something went wrong';
  let detail = 'An unexpected error occurred while loading this page.';
  let status: number | null = null;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (error.status === 404) {
      title = 'Page not found';
      detail =
        'The page you were looking for doesn’t exist or has been moved.';
    } else if (error.status === 401 || error.status === 403) {
      title = 'Access denied';
      detail = 'You need to sign in to view this page.';
    } else {
      title = `${error.status} ${error.statusText || 'Request failed'}`;
      detail =
        typeof error.data === 'string'
          ? error.data
          : 'The request could not be completed.';
    }
  } else if (error instanceof Error) {
    detail = error.message || detail;
  }

  const onReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-6 py-12 text-center text-text">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-down/30 bg-down/10">
        <AlertTriangle className="h-7 w-7 text-down" />
      </div>

      <div className="flex flex-col items-center gap-2 max-w-md">
        {status !== null && (
          <span className="num text-xs uppercase tracking-wider text-text-dim">
            Error {status}
          </span>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-text-dim">{detail}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onReload}>
          <RefreshCcw className="h-3.5 w-3.5" />
          Reload
        </Button>
        <Link
          to={ERoutes.DASHBOARD}
          className="inline-flex h-8 items-center gap-2 rounded bg-accent px-3 text-sm font-medium text-bg transition-all hover:brightness-110 active:brightness-95"
        >
          <Home className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>
      </div>

      {/* Developer-facing stack trace — only when the error was a real
          JS Error and we're not in production. Keeps the user screen
          clean in prod but gives engineers something to debug in dev. */}
      {import.meta.env.DEV && error instanceof Error && error.stack && (
        <pre className="max-w-2xl overflow-auto rounded border border-border bg-surface p-3 text-left text-[11px] leading-relaxed text-text-dim">
          {error.stack}
        </pre>
      )}
    </div>
  );
}

export default RouteErrorBoundary;
