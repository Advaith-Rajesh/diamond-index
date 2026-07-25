"""
Model loading and query logic for The Diamond Index.

Loaded ONCE at process startup (see main.py) and held in memory. Every request
reuses the same nn_model / scaler / dataframe instead of re-reading disk.

--- Data quirks discovered during inspection, handled explicitly here ---

1. "index" is a real column in feature_columns.json but it's a leftover row
   counter from whatever larger dataframe player_stats.csv was sliced from
   (values run 8..56131, not a positional range). It carries no baseball
   signal. We still pass it through the scaler/model because the model was
   FIT with it in the vector -- dropping it would silently shift every other
   feature into the wrong scaler slot. It is filtered out of every
   user-facing stat list in this file.

2. ZoneRating is constant 0 for all 3,254 players. It's a dead feature. Same
   rule: keep it in the vector for correctness, never show it.

3. The seven Position_* columns are not one-hot: values range 0-4 (looks like
   years-played-at-that-position within this dataset's window) and 916
   players have more than one column set. Five players (all real-world
   career DHs -- Cabrera, Cruz, Encarnacion, J.D. Martinez, Morneau) have ALL
   seven at zero, because DH isn't one of the seven categories. We derive a
   single "primary position" as argmax across those columns, falling back to
   "DH" when every column is zero.

4. Counting stats (AtBats, HomeRuns, Strikeouts, etc.) are PER-GAME rates,
   not season/career totals -- verified against real 2022 lines (e.g. Trout's
   BattingAverage of .283 matches his real average; Kershaw's OutsPitched of
   17.23 matches 379 outs / 22 starts). Only BattingAverage, OnBasePercentage,
   SluggingPercentage, EarnedRunAverage and OpponentsBattingAverage are
   already true rate stats. The frontend labels counting stats with a "/G"
   suffix so nothing reads like a season total that it isn't.

5. player_stats.csv has no player names, only Baseball-Reference-style IDs.
   Real names are joined in from lahman_1871-2024_csv/People.csv (all 3,254
   playerIDs matched with zero misses).

--- Similarity score ---

nn_model.kneighbors returns raw Euclidean distances in the *scaled* 54-D
feature space. Distance alone means nothing to a user, and an earlier
version of this file converted it with a fixed exponential decay curve
(score = 100 * exp(-distance / 6)). That produced a steep cliff -- a
real query returned scores like 78.4, 45.4, 33.4, 32.5 -- making it look
like only the top comp was a genuine match and the rest were noise, when
really the whole field of "top-6 neighbor" distances is fairly compressed.

Scores are now a percentile rank against the empirical distribution of
neighbor distances across the whole dataset (every player's distance to
its own nearest neighbors, computed once at startup in
_compute_distance_reference). A score of 90 means this pairing is closer
than 90% of all such player-pair comps in the dataset -- a statement
about *rank*, not an arbitrary curve.
"""
import json
import random

import numpy as np
import pandas as pd
from joblib import load

DEAD_OR_INTERNAL_COLUMNS = {"index", "ZoneRating"}

POSITION_COLUMNS = [
    "Position_1B", "Position_2B", "Position_3B", "Position_C",
    "Position_OF", "Position_P", "Position_SS",
]
POSITION_LABELS = {
    "Position_1B": "1B", "Position_2B": "2B", "Position_3B": "3B",
    "Position_C": "C", "Position_OF": "OF", "Position_P": "P",
    "Position_SS": "SS",
}

# Curated, role-relevant stats used for "closest match" / "biggest gap".
# Deliberately excludes internal columns and stats that would be trivially
# zero-vs-zero across roles (e.g. comparing a pitcher's BattingAverage).
BATTING_STATS = [
    "AtBats", "Runs", "Hits", "Doubles", "Triples", "HomeRuns", "RBI",
    "StolenBasesAllowed_Batting", "Walks", "Strikeouts",
    "BattingAverage", "OnBasePercentage", "SluggingPercentage",
]
PITCHING_STATS = [
    "OutsPitched", "Hits_Pitching", "EarnedRuns", "HomeRuns_Pitching",
    "Walks_Pitching", "Strikeouts_Pitching", "EarnedRunAverage",
    "Saves", "CompleteGames", "Shutouts", "OpponentsBattingAverage",
]

# Stats a user can drive with sliders in "Build a Ballplayer". Mapped to the
# real feature columns; everything else is filled from the dataset median.
SLIDER_STATS = {
    "AtBats": {"label": "At-Bats", "min": 0, "max": 5, "step": 0.05},
    "HomeRuns": {"label": "Home Runs", "min": 0, "max": 0.5, "step": 0.005},
    "BattingAverage": {"label": "Batting Average", "min": 0, "max": 0.35, "step": 0.001},
    "OnBasePercentage": {"label": "On-Base %", "min": 0, "max": 0.45, "step": 0.001},
    "SluggingPercentage": {"label": "Slugging %", "min": 0, "max": 0.7, "step": 0.001},
    "StolenBasesAllowed_Batting": {"label": "Stolen Bases", "min": 0, "max": 0.3, "step": 0.005},
    "Strikeouts": {"label": "Strikeouts", "min": 0, "max": 1.7, "step": 0.01},
    "EarnedRunAverage": {"label": "ERA", "min": 0, "max": 6, "step": 0.05},
}

# Rate-stat axes for the Head-to-Head radar chart. Spec called for a
# ZoneRating axis, but ZoneRating is constant 0 across the whole dataset (see
# module docstring) -- a flat spike there would misrepresent real signal, so
# it's swapped for Walks (BB rate), which is the more Moneyball-relevant
# swap anyway: plate discipline is the stat the market undervalued.
#
# The underlying column for the fourth axis is still raw Strikeouts, but the
# frontend plots it inverted (as "Contact") -- on every other axis here,
# bigger polygon = better, and a raw K-rate axis would break that (more
# strikeouts is worse, so a bigger shape wouldn't consistently mean a better
# player). Label reflects what's actually plotted.
RADAR_STATS = [
    ("BattingAverage", "BA"),
    ("OnBasePercentage", "OBP"),
    ("SluggingPercentage", "SLG"),
    ("Strikeouts", "Contact"),
    ("Walks", "BB Rate"),
]


class DiamondEngine:
    def __init__(self, data_dir="."):
        self.nn_model = load(f"{data_dir}/nn_model.joblib")
        self.scaler = load(f"{data_dir}/scaler.joblib")
        self.feature_columns = json.load(open(f"{data_dir}/feature_columns.json"))
        self.players = pd.read_csv(f"{data_dir}/player_stats.csv", index_col=0)

        people = pd.read_csv(
            f"{data_dir}/lahman_1871-2024_csv/People.csv",
            usecols=["playerID", "nameFirst", "nameLast", "debut", "finalGame"],
        ).set_index("playerID")
        self.players = self.players.join(people, how="left")

        self.medians = self.players[self.feature_columns].median()
        self.stat_scale = pd.Series(self.scaler.scale_, index=self.feature_columns)

        self.players["primary_position"] = self.players.apply(self._primary_position, axis=1)
        self.players["display_name"] = self.players.apply(
            lambda r: f"{r['nameFirst']} {r['nameLast']}" if pd.notna(r["nameFirst"]) else r.name,
            axis=1,
        )
        self.players["era"] = self.players.apply(self._era, axis=1)

        activity = self.players["AtBats"].fillna(0) + self.players["OutsPitched"].fillna(0)
        self._notable_ids = self.players.index[activity > activity.quantile(0.7)].tolist()

        self._distance_reference = self._compute_distance_reference()

    def _compute_distance_reference(self, sample_size=200_000, seed=0):
        """Empirical distribution of distances between random PAIRS of
        players (not just nearest-neighbor pairs), computed once at
        startup. A raw distance is later converted to a score by its
        percentile rank against this distribution: "90" means closer than
        90% of ALL player pairs -- matching what the UI caption says.

        First attempt used the distribution of each player's own top-6
        nearest-neighbor distances instead. That's a much more
        self-selected population (already the closest pairs in the
        dataset), so a genuinely great match like Trout-Alvarez (distance
        5.45) only out-ranked ~11% of it. Against a random sample of ALL
        pairs, that same distance beats ~78% of them -- the number that
        actually answers "closer than X% of all player pairs."
        """
        vectors = self.players[self.feature_columns].to_numpy(dtype=float)
        scaled = self.scaler.transform(vectors)
        n = len(scaled)
        rng = np.random.default_rng(seed)
        i = rng.integers(0, n, size=sample_size)
        j = rng.integers(0, n, size=sample_size)
        keep = i != j
        i, j = i[keep], j[keep]
        distances = np.linalg.norm(scaled[i] - scaled[j], axis=1)
        return np.sort(distances)

    @staticmethod
    def _primary_position(row):
        values = row[POSITION_COLUMNS]
        if values.max() <= 0:
            return "DH"
        return POSITION_LABELS[values.idxmax()]

    @staticmethod
    def _era(row):
        debut_year = str(row["debut"])[:4] if pd.notna(row["debut"]) else "?"
        final_year = str(row["finalGame"])[:4] if pd.notna(row["finalGame"]) else "present"
        return f"{debut_year}–{final_year}"

    def _feature_vector(self, player_id):
        return self.players.loc[[player_id], self.feature_columns].to_numpy(dtype=float)

    def _distances_to_scores(self, distances):
        ref = self._distance_reference
        n = len(ref)
        # searchsorted gives the count of reference distances <= d; the
        # fraction *greater* than d is what "percentile of similarity" means
        # here (a smaller distance should beat a larger share of the field).
        counts_at_or_below = np.searchsorted(ref, distances, side="right")
        percentile = 100.0 * (n - counts_at_or_below) / n
        return np.round(percentile, 1)

    def _public_stats(self, row):
        return {
            c: (None if pd.isna(row[c]) else round(float(row[c]), 4))
            for c in self.feature_columns
            if c not in DEAD_OR_INTERNAL_COLUMNS
        }

    def raw_feature_vector(self, player_id):
        """Every feature column at full precision, including 'index' and
        ZoneRating -- the two columns _public_stats hides from users.

        This exists specifically for "Build a Ballplayer": that mode seeds
        its sliders from a real player and must reconstruct the *exact*
        vector the model was fit on when the user hasn't touched anything.
        Using _public_stats (which drops 'index') silently replaces that
        column with the dataset median on every custom query, which alone
        was enough to turn a perfect self-match (distance 0, score 100)
        into a distance of ~1.4 (score ~79) -- verified by direct
        comparison against the real vector. 'index' is a meaningless row
        counter, but the model was fit with it in the vector, so dropping
        it changes the answer.
        """
        row = self.players.loc[player_id]
        return {c: float(row[c]) for c in self.feature_columns}

    def player_card(self, player_id):
        row = self.players.loc[player_id]
        return {
            "playerID": player_id,
            "name": row["display_name"],
            "era": row["era"],
            "season": int(row["yearID"]),
            "primaryPosition": row["primary_position"],
            "stats": self._public_stats(row),
        }

    def search(self, query, limit=20):
        q = query.strip().lower()
        if not q:
            return []
        mask = (
            self.players.index.str.lower().str.contains(q, regex=False)
            | self.players["display_name"].str.lower().str.contains(q, regex=False)
        )
        matches = self.players[mask].head(limit)
        return [
            {
                "playerID": pid,
                "name": row["display_name"],
                "era": row["era"],
                "season": int(row["yearID"]),
                "primaryPosition": row["primary_position"],
            }
            for pid, row in matches.iterrows()
        ]

    def random_player(self):
        return self.player_card(random.choice(self._notable_ids))

    def _role_stats_for(self, player_id):
        position = self.players.loc[player_id, "primary_position"]
        return PITCHING_STATS if position == "P" else BATTING_STATS

    def _stat_highlights(self, query_id, neighbor_row):
        query_row = self.players.loc[query_id]
        role_stats = self._role_stats_for(query_id)
        diffs = pd.Series(
            {
                stat: abs(query_row[stat] - neighbor_row[stat]) / self.stat_scale[stat]
                for stat in role_stats
            }
        ).sort_values()
        closest = diffs.index[:3].tolist()
        biggest_gap = diffs.index[-1]
        return {
            "closestMatch": [
                {
                    "stat": s,
                    "queryValue": round(float(query_row[s]), 4),
                    "neighborValue": round(float(neighbor_row[s]), 4),
                }
                for s in closest
            ],
            "biggestGap": {
                "stat": biggest_gap,
                "queryValue": round(float(query_row[biggest_gap]), 4),
                "neighborValue": round(float(neighbor_row[biggest_gap]), 4),
            },
        }

    def similar_to_player(self, player_id, n=6):
        if player_id not in self.players.index:
            return None
        vector = self._feature_vector(player_id)
        scaled = self.scaler.transform(vector)
        # +1 and filter self out, in case the query player isn't its own
        # nearest neighbor due to duplicate feature rows.
        distances, indices = self.nn_model.kneighbors(scaled, n_neighbors=min(n + 1, len(self.players)))
        return self._build_results(player_id, distances[0], indices[0], n)

    def similar_to_custom(self, partial_stats, n=6):
        full_stats = self.medians.copy()
        for key, value in partial_stats.items():
            if key in full_stats.index and value is not None:
                full_stats[key] = float(value)

        # The dataset median for most counting stats is 0 (most rows in this
        # dataset are bench/replacement-level players). Filling straight to
        # median leaves an internally-inconsistent player -- e.g. a
        # user-built .300/.400/.620 slugger with Hits/Walks stuck at 0 --
        # which drags the nearest-neighbor search toward low-usage bench
        # players instead of real sluggers. Where the sliders directly imply
        # a counting stat via an exact or standard sabermetric identity, we
        # derive it instead of leaving it at the median.
        #
        # These are fallbacks only: if the caller already supplied the real
        # Hits/Walks (e.g. Build a Ballplayer seeding its full vector from an
        # actual player), that real value must win. The OBP-based Walks
        # formula ignores HBP/SF and is only an approximation -- overwriting
        # a real Walks value with it was exactly the bug that capped a
        # perfect self-match at ~96.6 instead of 100.
        given = partial_stats
        if "Hits" not in given and "AtBats" in given and "BattingAverage" in given:
            full_stats["Hits"] = full_stats["AtBats"] * full_stats["BattingAverage"]
        if "Walks" not in given and "AtBats" in given and "OnBasePercentage" in given:
            # OBP ~= (Hits + Walks) / (AtBats + Walks), ignoring HBP/SF.
            # Solve for Walks given AtBats and Hits (just derived above, or
            # already at its median/user-set value).
            ab, obp, hits = full_stats["AtBats"], full_stats["OnBasePercentage"], full_stats["Hits"]
            if obp < 1:
                walks = (obp * ab - hits) / (1 - obp)
                full_stats["Walks"] = max(0.0, walks)
        vector = full_stats[self.feature_columns].to_numpy(dtype=float).reshape(1, -1)
        scaled = self.scaler.transform(vector)
        distances, indices = self.nn_model.kneighbors(scaled, n_neighbors=n)
        neighbors = []
        for dist, idx in zip(distances[0], indices[0]):
            row = self.players.iloc[idx]
            neighbors.append(
                {
                    "playerID": row.name,
                    "name": row["display_name"],
                    "era": row["era"],
                    "season": int(row["yearID"]),
                    "primaryPosition": row["primary_position"],
                    "similarityScore": float(self._distances_to_scores(np.array([dist]))[0]),
                    "stats": self._public_stats(row),
                }
            )
        return neighbors

    def _build_results(self, query_id, distances, indices, n):
        results = []
        for dist, idx in zip(distances, indices):
            row = self.players.iloc[idx]
            if row.name == query_id:
                continue
            results.append(
                {
                    "playerID": row.name,
                    "name": row["display_name"],
                    "era": row["era"],
                    "season": int(row["yearID"]),
                    "primaryPosition": row["primary_position"],
                    "similarityScore": float(self._distances_to_scores(np.array([dist]))[0]),
                    "stats": self._public_stats(row),
                    **self._stat_highlights(query_id, row),
                }
            )
            if len(results) == n:
                break
        return results

    def moneyball_flag(self, player_id):
        """OBP-vs-BA gap ('flagged' = True when OBP ranks meaningfully
        higher than BA -- the classic 'the market undervalued this player'
        signal), plus percentiles across four Moneyball-relevant rate
        stats so the frontend can generate a comment grounded in *this*
        player's actual shape instead of one fixed sentence for everyone
        who isn't flagged (which is most players -- the gap threshold is
        deliberately strict)."""
        row = self.players.loc[player_id]
        percentile_cols = {
            "OBP": "OnBasePercentage",
            "BA": "BattingAverage",
            "SLG": "SluggingPercentage",
            "BB": "Walks",
        }
        percentiles = {
            key: round(float((self.players[col] <= row[col]).mean() * 100), 1)
            for key, col in percentile_cols.items()
        }
        gap = percentiles["OBP"] - percentiles["BA"]
        standout = max(percentiles, key=percentiles.get)
        weakest = min(percentiles, key=percentiles.get)
        return {
            "flagged": bool(gap > 15),
            "obpPercentile": percentiles["OBP"],
            "baPercentile": percentiles["BA"],
            "slgPercentile": percentiles["SLG"],
            "bbPercentile": percentiles["BB"],
            "standoutStat": standout,
            "weakestStat": weakest,
        }

    def head_to_head(self, player_id_a, player_id_b):
        if player_id_a not in self.players.index or player_id_b not in self.players.index:
            return None
        row_a = self.players.loc[player_id_a]
        row_b = self.players.loc[player_id_b]
        radar = [
            {
                "stat": label,
                "a": round(float(row_a[col]), 4),
                "b": round(float(row_b[col]), 4),
            }
            for col, label in RADAR_STATS
        ]
        role_stats = sorted(set(self._role_stats_for(player_id_a)) | set(self._role_stats_for(player_id_b)))
        diffs = [
            {
                "stat": s,
                "a": round(float(row_a[s]), 4),
                "b": round(float(row_b[s]), 4),
                "diff": round(float(row_a[s] - row_b[s]), 4),
            }
            for s in role_stats
        ]
        return {
            "playerA": self.player_card(player_id_a),
            "playerB": self.player_card(player_id_b),
            "radar": radar,
            "diffs": diffs,
        }
