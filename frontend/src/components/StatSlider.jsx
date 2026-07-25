export default function StatSlider({
  id,
  label,
  min,
  max,
  step,
  value,
  onChange,
  display,
  secondary,
  disabled = false,
  disabledReason,
}) {
  return (
    <div className={disabled ? "opacity-40" : undefined}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="font-mono text-xs uppercase tracking-wider text-cream/70">
          {label}
          {disabled && disabledReason && (
            <span className="ml-2 normal-case italic text-cream/40">{disabledReason}</span>
          )}
        </label>
        <span className="flex items-baseline gap-1.5">
          <span className="font-mono text-sm tabular-nums text-chalk">{display}</span>
          {secondary && (
            <span className="font-mono text-xs tabular-nums text-cream/40">{secondary}</span>
          )}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-clay disabled:cursor-not-allowed"
      />
    </div>
  );
}
