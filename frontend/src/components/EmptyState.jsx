import { Link } from "react-router-dom";
import { EXAMPLE_CHIPS } from "./constants";

export default function EmptyState({ query }) {
  return (
    <div className="rounded-3xl border border-chalk/15 px-6 py-10 text-center">
      <p className="font-serif text-lg italic text-cream/80">
        Nobody in the archive answers to "{query}". Even the deepest bench doesn't go
        that deep.
      </p>
      <p className="mt-4 font-mono text-xs uppercase tracking-wider text-cream/50">
        Try one of these instead
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {EXAMPLE_CHIPS.map((chip) => (
          <Link
            key={chip.playerID}
            to={`/player/${chip.playerID}`}
            className="glow-hover rounded-full border border-clay/40 px-4 py-1.5 font-mono text-xs text-cream hover:bg-clay/10"
          >
            {chip.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
