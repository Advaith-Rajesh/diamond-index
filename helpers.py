# Moneyball "find similar players" - inference helper.
# nn_model + scaler were fit on the feature columns ONLY (playerID is the index of
# player_stats.csv, not a feature). To find players similar to a given one:
#   take the feature columns, scaler.transform, nn_model.kneighbors, then map the
#   returned row indices back to playerID via player_stats.csv (same row order).
#
# Usage in the backend:
#   import json, pandas as pd
#   from joblib import load
#   import helpers
#   nn_model = load("nn_model.joblib")
#   scaler   = load("scaler.joblib")
#   columns  = json.load(open("feature_columns.json"))
#   players  = pd.read_csv("player_stats.csv", index_col=0)   # index = playerID
#   neighbors = helpers.find_similar(nn_model, scaler, players, columns, player_id="aaronha01")
import numpy as np

def find_similar(nn_model, scaler, players_df, feature_columns, player_id=None, query_stats=None, n=6):
    # Provide either an existing player_id (a row in players_df) or a query_stats dict.
    if player_id is not None:
        row = players_df.loc[[player_id], feature_columns].to_numpy(dtype=float)
    else:
        row = np.array([[float(query_stats[c]) for c in feature_columns]])
    scaled = scaler.transform(row)
    idx = nn_model.kneighbors(scaled, n_neighbors=n, return_distance=False)[0]
    return players_df.iloc[idx]
