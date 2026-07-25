# The Diamond Index

A Moneyball-style scouting tool: search any player from 2015–2022 and find
who else in that window grades out the same way, statistically. Built on a
scikit-learn NearestNeighbors model over 54 standardized batting, pitching,
and fielding features.

Three modes:

- **Find My Guy** — search a player, get a ranked ladder of comps.
- **Build a Ballplayer** — invent a stat line with sliders, find historical
  matches.
- **Head to Head** — compare any two players on a radar chart and a
  diverging bar chart.

Plus a hero constellation on the landing page: a real 2D PCA projection of
every player's 54-feature vector, not decoration.

## Requirements

- Python 3.10+ (tested on 3.14)
- Node 20.19+ or 22.12+ (tested on 22.12.0) — Vite 8 requires this; if
  you're on an older Node via `nvm`, run `nvm install 22.12.0` first
- `npm`

## Setup

From the project root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cd frontend
npm install
cd ..
```

## Development

Two processes, in two terminals:

```bash
# Terminal 1: backend (FastAPI + the model)
source .venv/bin/activate
python3 main.py
```

```bash
# Terminal 2: frontend (Vite dev server, proxies /api to the backend)
cd frontend
npm run dev
```

Open the URL Vite prints (`http://localhost:5173`).

## Production

One process serves both the API and the built frontend on a single port —
this is what a deploy target like Replit runs.

```bash
# Build the frontend once
cd frontend
npm install
npm run build
cd ..

# Serve everything (respects $PORT, defaults to 5000)
source .venv/bin/activate
python3 main.py
```

```bash
# Or explicitly:
PORT=5000 python3 main.py
```

`main.py` binds to `0.0.0.0` and serves the compiled frontend from
`frontend/dist` alongside the `/api/*` routes, with a catch-all so
client-side routes (`/build`, `/compare`, `/player/:id`) work on refresh.

If you change anything under `frontend/src`, re-run `npm run build` before
the production server will pick it up — it serves whatever's already in
`frontend/dist`, not the source.

### Regenerating the hero constellation

`frontend/public/constellation.json` is a precomputed 2D PCA projection of
every player's feature vector, checked in as a static asset so the frontend
loads it instantly instead of computing it live. If `player_stats.csv`,
`scaler.joblib`, or `nn_model.joblib` ever change, regenerate it:

```bash
source .venv/bin/activate
python3 precompute_constellation.py
```

Then rebuild the frontend so the new file gets bundled.

## How the similarity score works

The model finds each player's nearest neighbors in a 54-dimension,
standardized feature space (batting, pitching, and fielding rates, plus a
few one-hot position flags). A raw Euclidean distance in that space means
nothing on its own, so it's converted to a 0–100 score by **percentile
rank against a reference distribution of 200,000 random player pairs**,
computed once at startup (`DiamondEngine._compute_distance_reference` in
`engine.py`). A score of 90 means: this pairing sits closer than 90% of all
random player pairs in the dataset. It's a statement about rank, not an
arbitrary decay curve.

## Data notes (things that aren't obvious from the files alone)

- **One row per player, not per season.** `player_stats.csv` has 3,254 rows
  and 3,254 unique `playerID`s — no repeats. Each row is a single featured
  season per player (shown as e.g. "2022 season" in the UI), spanning
  2015–2022, not a full career and not multiple rows per player.
- **Counting stats are per-game rates**, not season totals — verified
  against real box scores (e.g. Trout's `BattingAverage` of .283 matches
  his actual 2022 average). Displayed with a "/G" suffix; Build a
  Ballplayer additionally shows an illustrative "season pace" (rate × 150
  games) as secondary text, since the data has no games-played column to
  compute an exact total.
- **`index` and `ZoneRating` are dead/noise columns** kept in the feature
  vector only because the model was fit with them there — `ZoneRating` is
  constant 0 for every player, and `index` is a leftover row counter from
  a larger source dataframe. Both are hidden from every user-facing stat
  list.
- **No player names in the source data** — only Baseball-Reference-style
  IDs. Real names are joined in from `lahman_1871-2024_csv/People.csv`.
- **Player names are also required at runtime**: the app reads
  `lahman_1871-2024_csv/People.csv` on startup, so that folder needs to
  ship with the project, not just the model files.

## Project structure

```
main.py                  FastAPI routes
engine.py                Model loading + query logic (loaded once at startup)
precompute_constellation.py   Generates frontend/public/constellation.json
test_seed_selfmatch.py   Regression test: seeding a query from a real
                         player and querying unmodified must return that
                         player at ~100 similarity
requirements.txt
frontend/
  src/                   React app (Vite + Tailwind)
  public/constellation.json   Precomputed PCA projection (see above)
```

## Tests

```bash
source .venv/bin/activate
python3 test_seed_selfmatch.py
```
