import { useLayoutEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

const links = [
  { to: "/", label: "Find My Guy", end: true },
  { to: "/build", label: "Build a Ballplayer" },
  { to: "/compare", label: "Head to Head" },
];

export default function Nav() {
  const location = useLocation();
  const containerRef = useRef(null);
  const linkRefs = useRef({});
  const [indicator, setIndicator] = useState(null);

  useLayoutEffect(() => {
    const active = links.find((l) =>
      l.end ? location.pathname === l.to : location.pathname.startsWith(l.to)
    );
    const el = active && linkRefs.current[active.to];
    const container = containerRef.current;
    if (el && container) {
      const elRect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setIndicator({ left: elRect.left - containerRect.left, width: elRect.width });
    }
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-chalk/15 bg-navy/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-10">
        <NavLink to="/" className="group flex items-center gap-2.5">
          <BallMark />
          <span className="font-display text-xl tracking-wide text-chalk">
            DIAMOND<span className="text-clay-light">INDEX</span>
          </span>
        </NavLink>
        <nav
          aria-label="Modes"
          ref={containerRef}
          className="relative flex flex-wrap gap-5"
        >
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              ref={(el) => {
                linkRefs.current[link.to] = el;
              }}
              className={({ isActive }) =>
                `border-b-2 border-transparent pb-0.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                  isActive ? "text-chalk" : "text-cream/60 hover:text-cream"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          {indicator && (
            <span
              aria-hidden="true"
              className="absolute bottom-0 h-0.5 bg-clay transition-all duration-300 ease-out motion-reduce:transition-none"
              style={{ left: indicator.left, width: indicator.width }}
            />
          )}
        </nav>
      </div>
    </header>
  );
}

function BallMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" className="h-7 w-7 shrink-0">
      <circle cx="20" cy="20" r="18" fill="var(--color-cream)" />
      <path
        d="M6 10c5 4 5 16 0 20"
        fill="none"
        stroke="var(--color-clay)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M34 10c-5 4-5 16 0 20"
        fill="none"
        stroke="var(--color-clay)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10 8c1.5 1 2.5 2 3 3M10 32c1.5-1 2.5-2 3-3M30 8c-1.5 1-2.5 2-3 3M30 32c-1.5-1-2.5-2-3-3"
        stroke="var(--color-clay)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
