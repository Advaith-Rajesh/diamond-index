"""
Precomputes a 2D PCA projection of the scaled 54-feature matrix for the
hero constellation visualization. Run once (or whenever player_stats.csv /
the model changes) and commit the output -- the frontend loads it as a
static asset, no live computation or API round trip needed.

Usage: python3 precompute_constellation.py
"""
import json

import numpy as np
from sklearn.decomposition import PCA

from engine import DiamondEngine

OUTPUT_PATH = "frontend/public/constellation.json"


def main():
    engine = DiamondEngine()
    vectors = engine.players[engine.feature_columns].to_numpy(dtype=float)
    scaled = engine.scaler.transform(vectors)

    pca = PCA(n_components=2, random_state=0)
    coords = pca.fit_transform(scaled)

    # Normalize each axis independently to roughly [-1, 1] so the frontend
    # can map straight to a viewBox without knowing PCA's raw scale.
    for axis in range(2):
        col = coords[:, axis]
        span = max(abs(col.min()), abs(col.max())) or 1.0
        coords[:, axis] = col / span

    points = []
    for (player_id, row), (x, y) in zip(engine.players.iterrows(), coords):
        points.append(
            {
                "id": player_id,
                "n": row["display_name"],
                "s": int(row["yearID"]),
                "p": row["primary_position"],
                "x": round(float(x), 4),
                "y": round(float(y), 4),
            }
        )

    with open(OUTPUT_PATH, "w") as f:
        json.dump(points, f, separators=(",", ":"))

    print(f"Wrote {len(points)} points to {OUTPUT_PATH}")
    print(f"Explained variance ratio: {pca.explained_variance_ratio_}")


if __name__ == "__main__":
    main()
