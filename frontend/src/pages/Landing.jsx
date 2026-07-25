import { useNavigate } from "react-router-dom";
import { useState } from "react";
import PlayerSearch from "../components/PlayerSearch";
import Constellation from "../components/Constellation";
import { EXAMPLE_CHIPS } from "../components/constants";
import { getRandomPlayer } from "../api";

export default function Landing() {
  const navigate = useNavigate();
  const [surprising, setSurprising] = useState(false);
  const [previewId, setPreviewId] = useState(null);

  async function surpriseMe() {
    setSurprising(true);
    try {
      const player = await getRandomPlayer();
      navigate(`/player/${player.playerID}`);
    } finally {
      setSurprising(false);
    }
  }

  // The cream band below is the landing page's second material -- every
  // other view alternates dark and light, this used to be one flat navy
  // plane top to bottom.
  return (
    <div>
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
      <section>
        <p className="eyebrow-draw font-mono text-xs uppercase tracking-[0.15em] text-clay-light">
          A Moneyball scouting tool
        </p>
        <h1 className="mt-3 overflow-hidden font-display text-6xl leading-[0.92] tracking-wide text-chalk sm:text-7xl lg:-ml-1 lg:text-8xl">
          <span className="headline-line" style={{ animationDelay: "0ms" }}>
            FIND YOUR
          </span>
          <span
            className="headline-line text-clay"
            style={{ animationDelay: "240ms" }}
          >
            STATISTICAL
          </span>
          <span className="headline-line" style={{ animationDelay: "120ms" }}>
            TWIN
          </span>
        </h1>

        <div className="reveal in-view" style={{ animationDelay: "380ms" }}>
          <p className="mt-6 max-w-lg font-serif text-lg text-cream/80">
            The market prices players on batting average and home runs. It underprices
            on-base percentage and plate discipline. That gap is where the comps in this
            tool live.
          </p>
          <p className="mt-3 max-w-lg font-serif text-base text-cream/60">
            3,254 players, one featured season each, spanning 2015 to 2022. Search for a
            name and see who else grades out the same way.
          </p>

          <div className="mt-8 max-w-xl">
            <PlayerSearch autoFocus onSelect={(p) => navigate(`/player/${p.playerID}`)} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-cream/50">
          <span className="uppercase tracking-wider text-cream/40">Try:</span>
          {EXAMPLE_CHIPS.map((chip, i) => (
            <button
              key={chip.playerID}
              onClick={() => navigate(`/player/${chip.playerID}`)}
              onMouseEnter={() => setPreviewId(chip.playerID)}
              onMouseLeave={() => setPreviewId((id) => (id === chip.playerID ? null : id))}
              onFocus={() => setPreviewId(chip.playerID)}
              onBlur={() => setPreviewId((id) => (id === chip.playerID ? null : id))}
              className="underline-draw hover:text-cream"
              style={{ animationDelay: `${480 + i * 60}ms` }}
            >
              {chip.name}
              {i < EXAMPLE_CHIPS.length - 1 ? "," : ""}
            </button>
          ))}
        </div>

        <button
          onClick={surpriseMe}
          disabled={surprising}
          className="ghost-link reveal in-view mt-8 font-mono text-sm uppercase tracking-wider text-cream/70 hover:text-chalk disabled:opacity-50"
          style={{ animationDelay: "780ms" }}
        >
          {surprising ? "Pulling a file..." : "Surprise me"}
        </button>
      </section>

      <aside
        aria-hidden={!previewId}
        className="relative mt-4 flex items-center justify-center lg:mt-0"
      >
        <Constellation highlightId={previewId} />
      </aside>
    </div>

    <div className="relative left-1/2 right-1/2 -mx-[50vw] mt-16 w-screen bg-cream text-navy">
      <div className="mx-auto max-w-6xl px-6 py-14 sm:px-10">
        <p className="font-mono text-xs uppercase tracking-widest text-navy/60">
          How this works
        </p>
        <div className="mt-6 grid gap-8 sm:grid-cols-3">
          <Step
            n="01"
            title="Search"
            body="Type any player from 2015 to 2022. We pull their full stat line, all 54 features."
          />
          <Step
            n="02"
            title="Compare"
            body="A nearest-neighbor model finds who else in the dataset grades out the same way."
          />
          <Step
            n="03"
            title="Discover"
            body="See where the market misjudged a player: OBP over batting average, contact over power."
          />
        </div>
      </div>
    </div>
    </div>
  );
}

function Step({ n, title, body }) {
  return (
    <div>
      <p className="font-mono text-sm text-clay-oncream">{n}</p>
      <h3 className="mt-1 font-heading text-xl font-semibold tracking-tight text-navy">
        {title}
      </h3>
      <p className="mt-2 font-serif text-sm text-navy/70">{body}</p>
    </div>
  );
}
