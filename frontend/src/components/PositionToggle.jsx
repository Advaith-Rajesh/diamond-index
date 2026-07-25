const POSITIONS = ["1B", "2B", "3B", "C", "OF", "P", "SS", "DH"];

export default function PositionToggle({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Position" className="flex flex-wrap gap-2">
      {POSITIONS.map((pos) => (
        <button
          key={pos}
          type="button"
          role="radio"
          aria-checked={value === pos}
          onClick={() => onChange(pos)}
          className={`glow-hover rounded-full border px-4 py-1.5 font-mono text-xs uppercase tracking-wider ${
            value === pos
              ? "border-clay bg-clay text-chalk"
              : "border-chalk/25 text-cream/70 hover:border-chalk/50"
          }`}
        >
          {pos}
        </button>
      ))}
    </div>
  );
}
