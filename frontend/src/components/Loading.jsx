export default function Loading({ label = "Pulling the scouting file…" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 py-12 text-cream/70"
    >
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-clay border-t-transparent"
      />
      <span className="font-mono text-sm">{label}</span>
    </div>
  );
}
