import { useState } from "react";
import { Link } from "react-router-dom";
import { formatStat, statLabel, keyStatsFor } from "../statMeta";
import useCountUp from "../hooks/useCountUp";

export default function ScoutCard({ neighbor, rank }) {
  const [expanded, setExpanded] = useState(false);
  const closestLabels = neighbor.closestMatch?.map((c) => statLabel(c.stat)).join(", ");
  const gap = neighbor.biggestGap;
  // Score is now a percentile rank (see engine.py), so "hot" means
  // genuinely exceptional -- closer than 80% of all comps in the dataset --
  // not just "above average."
  const hot = neighbor.similarityScore >= 80;
  const displayScore = useCountUp(neighbor.similarityScore, { duration: 600 });

  return (
    <article className="card-glow group relative overflow-hidden rounded-3xl border border-navy/15 bg-cream p-5 text-navy transition-transform duration-200 hover:-translate-y-[3px] focus-within:-translate-y-[3px] sm:p-6">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-6 -right-2 select-none font-display text-[8rem] leading-none text-navy/[0.06] transition-colors duration-200 group-hover:text-navy/[0.12]"
      >
        {String(rank).padStart(2, "0")}
      </span>

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-clay-oncream">
            Comp №{rank} · {neighbor.season}
          </p>
          <Link
            to={`/player/${neighbor.playerID}`}
            className="font-heading text-2xl font-semibold tracking-tight text-navy transition-colors hover:text-clay-oncream sm:text-3xl"
          >
            {neighbor.name}
          </Link>
          <p className="font-mono text-xs uppercase tracking-wider text-navy/75">
            {neighbor.primaryPosition} · {neighbor.era} · Scout ID {neighbor.playerID}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={`font-mono text-4xl font-bold tabular-nums ${
              hot ? "text-signal-oncream" : "text-navy"
            }`}
          >
            {displayScore.toFixed(1)}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-navy/75">
            Similarity
          </p>
          <div className="mt-1.5 h-1.5 w-20 overflow-hidden rounded-full bg-navy/10">
            <div
              className={`h-full rounded-full ${hot ? "bg-signal-oncream" : "bg-clay"}`}
              style={{ width: `${Math.min(100, displayScore)}%` }}
            />
          </div>
        </div>
      </div>

      {(closestLabels || gap) && (
        <div className="relative mt-4 space-y-1.5 font-serif text-sm">
          {closestLabels && (
            <p>
              <span className="font-semibold text-navy">Locks in tight</span> on{" "}
              {closestLabels}.
            </p>
          )}
          {gap && (
            <p>
              <span className="font-semibold text-clay-oncream">Biggest gap:</span>{" "}
              {statLabel(gap.stat)} ({formatStat(gap.stat, gap.queryValue)} vs{" "}
              {formatStat(gap.stat, gap.neighborValue)})
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="glow-hover relative mt-4 rounded-full border border-navy/20 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-navy/70 hover:text-navy"
      >
        {expanded ? "Hide full stat line −" : "Show full stat line +"}
      </button>

      {expanded && (
        <dl className="relative mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-navy/10 pt-4 sm:grid-cols-4">
          {keyStatsFor(neighbor.primaryPosition).map((stat) => (
            <div key={stat}>
              <dt className="font-mono text-[10px] uppercase tracking-wider text-navy/50">
                {statLabel(stat)}
              </dt>
              <dd className="font-mono text-sm tabular-nums text-navy">
                {formatStat(stat, neighbor.stats[stat])}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}
