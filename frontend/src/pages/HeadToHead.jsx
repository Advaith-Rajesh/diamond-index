import { useEffect, useRef, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import { getHeadToHead } from "../api";
import PlayerSearch from "../components/PlayerSearch";
import Loading from "../components/Loading";
import { statLabel } from "../statMeta";

const DEFAULT_A = "troutmi01";
const DEFAULT_B = "judgeaa01";

// The five radar axes live on very different natural scales (the
// Strikeouts column behind "Contact" can exceed 1.5, while BA tops out
// around 0.33) -- a single shared radius would squash the lower-magnitude
// stats near the center. Each axis is normalized to its own realistic
// ceiling (the actual dataset max for that stat, from player_stats.csv)
// purely for the chart's geometry; raw values still show in the tooltip.
const RADAR_CEILINGS = { BA: 0.33, OBP: 0.43, SLG: 0.7, Contact: 1.6, "BB Rate": 0.9 };

// On every other axis, bigger polygon = better. The backend's "Contact"
// axis is still raw Strikeouts underneath (fewer is better), so its
// chart-geometry value is inverted here to keep that "bigger = better"
// reading consistent across the whole shape. The raw K-rate still shows
// in the tooltip via rawA/rawB, unmodified.
const INVERTED_AXES = new Set(["Contact"]);

// A stable reference matters here: recharts memoizes scale computation
// internally, and passing a fresh [0, 100] array literal on every render
// was silently breaking that memoization -- the Radar polygons rendered
// collapsed to the center point even though the underlying data was
// correct, verified by logging radarData directly.
const RADAR_DOMAIN = [0, 100];

function buildVerdict(playerA, playerB, radar) {
  const withGap = radar.map((r) => ({ ...r, gap: Math.abs(r.a - r.b) }));
  const sorted = [...withGap].sort((a, b) => a.gap - b.gap);
  const closest = sorted.slice(0, 2).map((r) => r.stat);
  const furthest = sorted[sorted.length - 1].stat;
  return `${playerA.name} and ${playerB.name} share a similar profile through ${closest.join(" and ")}. They separate most on ${furthest}.`;
}

export default function HeadToHead() {
  const [playerA, setPlayerA] = useState(DEFAULT_A);
  const [playerB, setPlayerB] = useState(DEFAULT_B);
  const [editingA, setEditingA] = useState(false);
  const [editingB, setEditingB] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const playerBRef = useRef(null);

  useEffect(() => {
    if (!playerA || !playerB) return;
    setLoading(true);
    setError(null);
    getHeadToHead(playerA, playerB)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [playerA, playerB]);

  const radarData = data?.radar.map((r) => {
    const ceiling = RADAR_CEILINGS[r.stat] ?? Math.max(r.a, r.b);
    const inverted = INVERTED_AXES.has(r.stat);
    const toPoint = (v) => {
      const pct = Math.round((v / ceiling) * 100);
      return inverted ? 100 - pct : pct;
    };
    return {
      stat: r.stat,
      A: toPoint(r.a),
      B: toPoint(r.b),
      rawA: r.a,
      rawB: r.b,
    };
  });
  const diffData = data?.diffs.map((d) => ({ stat: statLabel(d.stat), diff: d.diff }));

  return (
    <div>
      <h1 className="font-heading text-3xl font-semibold tracking-tight text-chalk">
        Head to head
      </h1>
      <p className="mt-2 font-serif text-sm text-cream/70">
        Pick any two players. The radar shows the Moneyball-relevant rate stats. The bars
        below show exactly where they pull apart.
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          {editingA ? (
            <PlayerSearch
              label="PLAYER A"
              autoFocus
              onSelect={(p) => {
                setPlayerA(p.playerID);
                setEditingA(false);
                playerBRef.current?.focus();
              }}
            />
          ) : (
            <PlayerSlot
              label="PLAYER A"
              player={data?.playerA}
              colorClass="text-clay-light"
              onChange={() => setEditingA(true)}
            />
          )}
        </div>
        <div>
          {editingB ? (
            <PlayerSearch
              ref={playerBRef}
              label="PLAYER B"
              onSelect={(p) => {
                setPlayerB(p.playerID);
                setEditingB(false);
              }}
            />
          ) : (
            <PlayerSlot
              label="PLAYER B"
              player={data?.playerB}
              colorClass="text-slate"
              onChange={() => setEditingB(true)}
            />
          )}
        </div>
      </div>

      {loading && <Loading label="Building the comparison…" />}
      {error && <p className="mt-6 font-serif text-cream/70">{error}</p>}

      {data && !loading && (
        <>
          <p className="mt-6 max-w-2xl font-serif text-base italic text-cream/80">
            {buildVerdict(data.playerA, data.playerB, data.radar)}
          </p>

          {/* Full-bleed cream section: the page's second material. Breaks out
              of the centered max-w-6xl column to the full viewport width. */}
          <div className="relative left-1/2 right-1/2 -mx-[50vw] mt-8 w-screen bg-cream text-navy">
            <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:px-10 lg:grid-cols-2">
              <div
                role="img"
                aria-label={`Radar chart comparing ${data.playerA.name} and ${data.playerB.name} across batting average, on-base percentage, slugging percentage, contact rate, and walk rate.`}
              >
                <p className="font-mono text-xs uppercase tracking-widest text-navy/70">
                  Rate-Stat Radar
                </p>
                <ResponsiveContainer width="100%" height={360}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(11,22,34,0.2)" />
                    <PolarAngleAxis
                      dataKey="stat"
                      tick={{ fill: "#0b1622", fontSize: 12, fontFamily: "JetBrains Mono" }}
                    />
                    <PolarRadiusAxis domain={RADAR_DOMAIN} tick={false} axisLine={false} />
                    <Radar
                      name={data.playerA.name}
                      dataKey="A"
                      stroke="#c2502f"
                      fill="#c2502f"
                      fillOpacity={0.3}
                    />
                    <Radar
                      name={data.playerB.name}
                      dataKey="B"
                      stroke="#3f5568"
                      fill="#3f5568"
                      fillOpacity={0.22}
                    />
                    <Tooltip
                      contentStyle={{ background: "#fdfcf8", border: "1px solid rgba(11,22,34,0.15)" }}
                      labelStyle={{ color: "#0b1622" }}
                      formatter={(_value, name, item) => {
                        const raw = name === data.playerA.name ? item.payload.rawA : item.payload.rawB;
                        return [raw.toFixed(3), name];
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div
                role="img"
                aria-label={`Bar chart of per-stat differences between ${data.playerA.name} and ${data.playerB.name}. Bars pointing right favor ${data.playerA.name}. Bars pointing left favor ${data.playerB.name}.`}
              >
                <p className="font-mono text-xs uppercase tracking-widest text-navy/70">
                  Where they diverge ({data.playerA.name} minus {data.playerB.name})
                </p>
                <ResponsiveContainer width="100%" height={Math.max(360, diffData.length * 32)}>
                  <BarChart data={diffData} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid stroke="rgba(11,22,34,0.12)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#0b1622", fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="stat"
                      width={140}
                      tick={{ fill: "#0b1622", fontSize: 11, fontFamily: "JetBrains Mono" }}
                    />
                    <Tooltip
                      contentStyle={{ background: "#fdfcf8", border: "1px solid rgba(11,22,34,0.15)" }}
                      labelStyle={{ color: "#0b1622" }}
                    />
                    <Bar dataKey="diff">
                      {diffData.map((d, i) => (
                        <Cell key={i} fill={d.diff >= 0 ? "#c2502f" : "#3f5568"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PlayerSlot({ label, player, colorClass, onChange }) {
  if (!player) return null;
  return (
    <div className="flex items-center justify-between border-b-2 border-chalk/15 pb-2">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-cream/40">{label}</p>
        <h2 className={`font-heading text-2xl font-semibold tracking-tight ${colorClass}`}>
          {player.name}
        </h2>
        <p className="font-mono text-xs uppercase tracking-wider text-cream/50">
          {player.primaryPosition} · {player.season} season · Scout ID {player.playerID}
        </p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="ghost-link shrink-0 font-mono text-xs uppercase tracking-wider text-cream/60 hover:text-chalk"
      >
        Change
      </button>
    </div>
  );
}
