import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from engine import DiamondEngine, SLIDER_STATS

app = FastAPI(title="The Diamond Index")
engine = DiamondEngine()

FRONTEND_DIST = Path(__file__).parent / "frontend" / "dist"


class CustomStatsRequest(BaseModel):
    stats: dict[str, float]
    n: int = 6


@app.get("/api/players")
def search_players(q: str = Query("", description="Search text")):
    return engine.search(q)


@app.get("/api/player/{player_id}")
def get_player(player_id: str):
    if player_id not in engine.players.index:
        raise HTTPException(status_code=404, detail=f"No player with id '{player_id}'")
    card = engine.player_card(player_id)
    card["moneyball"] = engine.moneyball_flag(player_id)
    return card


@app.get("/api/similar/{player_id}")
def get_similar(player_id: str, n: int = 6):
    results = engine.similar_to_player(player_id, n=n)
    if results is None:
        raise HTTPException(status_code=404, detail=f"No player with id '{player_id}'")
    return {
        "query": engine.player_card(player_id),
        "neighbors": results,
        "scoreExplainer": (
            "Score = percentile rank against every top-comp pairing in the dataset. "
            "90 means this pairing sits closer than 90% of all of them."
        ),
    }


@app.post("/api/similar/custom")
def post_similar_custom(body: CustomStatsRequest):
    results = engine.similar_to_custom(body.stats, n=body.n)
    return {
        "neighbors": results,
        "scoreExplainer": (
            "Score = percentile rank against every top-comp pairing in the dataset. "
            "90 means this pairing sits closer than 90% of all of them."
        ),
    }


@app.get("/api/random")
def get_random():
    return engine.random_player()


@app.get("/api/player/{player_id}/vector")
def get_player_vector(player_id: str):
    """Full-precision 54-feature vector for a player, including 'index' and
    ZoneRating. Used only to seed 'Build a Ballplayer' -- never rendered as
    a stat. See raw_feature_vector's docstring for why this can't just
    reuse the regular player stats."""
    if player_id not in engine.players.index:
        raise HTTPException(status_code=404, detail=f"No player with id '{player_id}'")
    return engine.raw_feature_vector(player_id)


@app.get("/api/sliders")
def get_slider_config():
    return {
        "sliders": SLIDER_STATS,
        "medians": {k: round(float(engine.medians[k]), 4) for k in SLIDER_STATS},
    }


@app.get("/api/head-to-head")
def get_head_to_head(a: str, b: str):
    result = engine.head_to_head(a, b)
    if result is None:
        raise HTTPException(status_code=404, detail="One or both player ids not found")
    return result


if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)
