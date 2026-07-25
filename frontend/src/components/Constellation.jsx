import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSimilar } from "../api";

// Signal green is reserved for similarity scores/the selected point --
// none of the position colors may use it.
const POSITION_COLORS = {
  OF: "#38bdf8",
  "1B": "#60a5fa",
  "2B": "#c084fc",
  "3B": "#f472b6",
  SS: "#facc15",
  C: "#22d3ee",
  P: "#d97354",
  DH: "#94a3b8",
};

// Below this viewport width, render a static, lower-density, non-interactive
// version -- per spec, the constellation degrades on mobile rather than
// trying to support hover/tap targets at that density.
const MOBILE_BREAKPOINT = 768;

export default function Constellation({ highlightId }) {
  const navigate = useNavigate();
  const [points, setPoints] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [neighborIds, setNeighborIds] = useState([]);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT
  );
  const containerRef = useRef(null);

  useEffect(() => {
    fetch("/constellation.json")
      .then((r) => r.json())
      .then(setPoints);
  }, []);

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!highlightId || isMobile) {
      setNeighborIds([]);
      return;
    }
    let cancelled = false;
    getSimilar(highlightId, 6).then((res) => {
      if (!cancelled) setNeighborIds(res.neighbors.map((n) => n.playerID));
    });
    return () => {
      cancelled = true;
    };
  }, [highlightId, isMobile]);

  const byId = useMemo(() => {
    if (!points) return {};
    const map = {};
    for (const p of points) map[p.id] = p;
    return map;
  }, [points]);

  const displayed = useMemo(() => {
    if (!points) return [];
    return isMobile ? points.filter((_, i) => i % 4 === 0) : points;
  }, [points, isMobile]);

  if (!points) return <div className="aspect-square w-full max-w-md" />;

  const highlight = highlightId && byId[highlightId];

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <svg
        viewBox="-1.15 -1.15 2.3 2.3"
        className="w-full"
        role={isMobile ? "presentation" : "img"}
        aria-label={
          isMobile
            ? undefined
            : "A 2D projection of every player's statistical profile, colored by position. Hover or click a point to see that player."
        }
      >
        <g className={isMobile ? "" : "constellation-drift"}>
          {displayed.map((p) => {
            const isHighlight = p.id === highlightId;
            const isNeighbor = neighborIds.includes(p.id);
            return (
              <circle
                key={p.id}
                cx={p.x}
                cy={p.y}
                r={isHighlight ? 0.042 : isNeighbor ? 0.028 : 0.016}
                fill={isHighlight ? "var(--color-clay)" : POSITION_COLORS[p.p] || "#94a3b8"}
                opacity={isHighlight ? 1 : isNeighbor ? 0.95 : 0.55}
                className={isMobile ? "" : "cursor-pointer transition-[r,opacity] duration-200"}
                style={!isMobile ? { pointerEvents: "auto" } : undefined}
                onMouseEnter={() => !isMobile && setHovered(p)}
                onMouseLeave={() => !isMobile && setHovered((h) => (h === p ? null : h))}
                onClick={() => !isMobile && navigate(`/player/${p.id}`)}
              />
            );
          })}
          {highlight &&
            neighborIds.map((nid, i) => {
              const n = byId[nid];
              if (!n) return null;
              return (
                <line
                  key={nid}
                  x1={highlight.x}
                  y1={highlight.y}
                  x2={n.x}
                  y2={n.y}
                  stroke="var(--color-clay)"
                  strokeWidth="0.004"
                  opacity="0.5"
                  className="constellation-line"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              );
            })}
        </g>
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute rounded border border-chalk/20 bg-navy-light px-2 py-1 font-mono text-[11px] text-chalk"
          style={{
            left: `${((hovered.x + 1.15) / 2.3) * 100}%`,
            top: `${((hovered.y + 1.15) / 2.3) * 100}%`,
            transform: "translate(-50%, -140%)",
          }}
        >
          {hovered.n} · {hovered.s}
        </div>
      )}
    </div>
  );
}
