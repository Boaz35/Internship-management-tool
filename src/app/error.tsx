"use client";

// Route-level error boundary — shows a friendly message instead of a bare
// "server-side exception" page, and logs the real error to the console
// (visible in Vercel → Deployment → Runtime Logs).
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          The app hit an unexpected error. If this keeps happening, check that
          the database migrations have run and the environment variables are
          set.
        </p>
        {error.digest && (
          <p className="mt-3 text-xs text-slate-400">Ref: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
