export function LoadingState({ label = "Loading your workspace" }: { label?: string }) {
  return (
    <div role="status" className="grid gap-5">
      <span className="text-sm text-muted-foreground">{label}…</span>
      <div aria-hidden="true" className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map(item => (
          <div key={item} className="grid gap-5 rounded-lg border bg-card p-6">
            <div className="h-5 w-2/3 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-3/4 rounded bg-muted" />
            <div className="h-11 w-40 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
