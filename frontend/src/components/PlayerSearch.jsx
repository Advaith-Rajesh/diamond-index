import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { searchPlayers } from "../api";

const PlayerSearch = forwardRef(function PlayerSearch(
  { onSelect, label = "SCOUT REPORT / PLAYER NAME", autoFocus = false },
  ref
) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searched, setSearched] = useState(false);
  const [focused, setFocused] = useState(false);
  const listboxId = useId();
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      setOpen(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const matches = await searchPlayers(query);
      setResults(matches);
      setSearched(true);
      setOpen(true);
      setActiveIndex(-1);
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function select(player) {
    setOpen(false);
    setQuery("");
    setResults([]);
    onSelect(player);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      // No result arrow-keyed into focus yet -- Enter still commits to the
      // top match instead of doing nothing, since that's the obviously
      // intended target.
      select(results[activeIndex >= 0 ? activeIndex : 0]);
    }
  }

  return (
    <div className="relative">
      <label
        className={`block font-mono text-xs uppercase tracking-[0.15em] transition-colors ${
          focused ? "text-clay" : "text-cream/40"
        }`}
      >
        {label}
      </label>
      <div className="relative mt-2">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => {
            setFocused(true);
            results.length > 0 && setOpen(true);
          }}
          onBlur={() => setFocused(false)}
          spellCheck={false}
          autoComplete="off"
          className="w-full appearance-none border-0 bg-transparent py-1 font-display text-3xl uppercase tracking-wide text-chalk caret-clay outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none sm:text-4xl"
        />
        {focused && query.length === 0 && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-1/2 h-7 w-3 -translate-y-1/2 bg-clay motion-safe:animate-[cursor-blink_1s_steps(1)_infinite] sm:h-8"
          />
        )}
        <div
          className={`mt-1 bg-clay transition-all ${focused ? "h-1" : "h-0.5"}`}
        />
      </div>

      {open && results.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-2 w-full border border-navy/15 bg-cream"
        >
          {results.map((player, i) => (
            <li
              key={player.playerID}
              role="presentation"
              className="stagger-in border-b border-navy/10 last:border-b-0"
              style={{ animationDelay: `${i * 25}ms` }}
            >
              <button
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={() => select(player)}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left font-mono text-sm transition-colors ${
                  i === activeIndex ? "bg-clay/20 text-navy" : "text-navy/80 hover:bg-navy/5"
                }`}
              >
                <span>{player.name}</span>
                <span className="text-xs uppercase text-navy/50">
                  {player.primaryPosition} · {player.season}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && searched && results.length === 0 && (
        <div
          id={listboxId}
          className="absolute z-10 mt-2 w-full border border-navy/15 bg-cream px-4 py-3 font-mono text-sm text-navy/60"
        >
          No matches for "{query}".
        </div>
      )}
    </div>
  );
});

export default PlayerSearch;
