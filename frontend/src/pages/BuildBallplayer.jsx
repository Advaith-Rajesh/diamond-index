import { useEffect, useRef, useState } from "react";
import {
  getPlayer,
  getPlayerVector,
  getRandomPlayer,
  getSliderConfig,
  getSimilarCustom,
} from "../api";
import StatSlider from "../components/StatSlider";
import PositionToggle from "../components/PositionToggle";
import ScoutCard from "../components/ScoutCard";
import Loading from "../components/Loading";
import Reveal from "../components/Reveal";
import { formatStat, seasonPace, REFERENCE_SEASON_GAMES } from "../statMeta";

const SEED_PLAYER = "troutmi01";
const POSITION_COLUMNS = [
  "Position_1B", "Position_2B", "Position_3B", "Position_C",
  "Position_OF", "Position_P", "Position_SS",
];

// Only one slider in this set is pitching-specific (ERA); the rest are
// batting stats. Whichever side doesn't match the selected position is
// disabled rather than removed -- an ERA slider for an outfielder, or a
// batting-average slider for a pure pitcher, is noise either way.
const PITCHING_SLIDER_KEYS = new Set(["EarnedRunAverage"]);

function applyPosition(stats, position) {
  const next = { ...stats };
  for (const col of POSITION_COLUMNS) {
    next[col] = col === `Position_${position}` ? 1 : 0;
  }
  return next;
}

export default function BuildBallplayer() {
  const [sliderConfig, setSliderConfig] = useState(null);
  const [stats, setStats] = useState(null);
  const [position, setPosition] = useState("OF");
  const [neighbors, setNeighbors] = useState(null);
  const [scoreExplainer, setScoreExplainer] = useState("");
  const [loading, setLoading] = useState(true);
  const [querying, setQuerying] = useState(false);
  const debounceRef = useRef(null);
  const seedRef = useRef(null);

  useEffect(() => {
    Promise.all([getSliderConfig(), getPlayer(SEED_PLAYER), getPlayerVector(SEED_PLAYER)]).then(
      ([config, player, vector]) => {
        setSliderConfig(config.sliders);
        setStats(vector);
        setPosition(player.primaryPosition);
        seedRef.current = { vector, position: player.primaryPosition };
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    if (!stats) return;
    setQuerying(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const result = await getSimilarCustom(applyPosition(stats, position), 6);
      setNeighbors(result.neighbors);
      setScoreExplainer(result.scoreExplainer);
      setQuerying(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [stats, position]);

  function updateSlider(key, value) {
    setStats((prev) => ({ ...prev, [key]: value }));
  }

  async function randomize() {
    setLoading(true);
    const player = await getRandomPlayer();
    const vector = await getPlayerVector(player.playerID);
    setStats(vector);
    setPosition(player.primaryPosition);
    seedRef.current = { vector, position: player.primaryPosition };
    setLoading(false);
  }

  function resetToSeed() {
    if (!seedRef.current) return;
    setStats(seedRef.current.vector);
    setPosition(seedRef.current.position);
  }

  if (loading || !stats || !sliderConfig) {
    return <Loading label="Loading the workbench…" />;
  }

  const isPitcher = position === "P";

  return (
    <div className="grid gap-10 lg:grid-cols-[380px_1fr]">
      <section>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-chalk">
          Build a ballplayer
        </h1>
        <p className="mt-2 font-serif text-sm text-cream/70">
          Sliders start loaded with a real profile ({SEED_PLAYER}). Move them and we'll
          find who in history matches your invention. Everything you don't touch stays at
          that seed player's real value.
        </p>

        <div className="mt-4 flex gap-3">
          <button
            onClick={randomize}
            className="rounded border border-clay px-4 py-2 font-mono text-xs uppercase tracking-wider text-clay-light transition-colors hover:bg-clay hover:text-chalk"
          >
            Randomize
          </button>
          <button
            onClick={resetToSeed}
            className="ghost-link rounded px-4 py-2 font-mono text-xs uppercase tracking-wider text-cream/60 hover:text-chalk"
          >
            Reset to seed
          </button>
        </div>

        <div className="mt-6">
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-cream/50">
            Position
          </p>
          <PositionToggle value={position} onChange={setPosition} />
        </div>

        <div className="mt-6 space-y-5">
          {Object.entries(sliderConfig).map(([key, cfg]) => {
            const isPitchingSlider = PITCHING_SLIDER_KEYS.has(key);
            const disabled = isPitchingSlider ? !isPitcher : isPitcher;
            const pace = seasonPace(key, stats[key] ?? 0);
            return (
              <StatSlider
                key={key}
                id={key}
                label={cfg.label}
                min={cfg.min}
                max={cfg.max}
                step={cfg.step}
                value={stats[key] ?? 0}
                onChange={(v) => updateSlider(key, v)}
                display={formatStat(key, stats[key] ?? 0)}
                secondary={pace !== null ? `≈${pace} / ${REFERENCE_SEASON_GAMES}G season` : null}
                disabled={disabled}
                disabledReason={
                  disabled ? (isPitchingSlider ? "pitchers only" : "not for pitchers") : null
                }
              />
            );
          })}
        </div>
      </section>

      <section>
        <p className="font-mono text-xs uppercase tracking-widest text-cream/50">
          Historical Comps
        </p>
        {scoreExplainer && (
          <p className="mt-1 font-mono text-xs text-cream/40">{scoreExplainer}</p>
        )}
        {querying && <Loading label="Scanning the archive…" />}
        {!querying && neighbors && (
          <div className="mt-4 space-y-4">
            {neighbors.map((neighbor, i) => (
              <Reveal key={neighbor.playerID} delay={i * 90}>
                <ScoutCard neighbor={neighbor} rank={i + 1} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
