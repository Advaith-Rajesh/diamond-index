"""
Regression test for the Build a Ballplayer self-match bug: seeding from a
real player and querying without touching any slider must return that same
player as the top comp, at ~100 similarity. Run: python3 test_seed_selfmatch.py
"""
import random

from engine import DiamondEngine

engine = DiamondEngine()
random.seed(7)
sample_ids = random.sample(list(engine.players.index), 3)

all_passed = True
for player_id in sample_ids:
    vector = engine.raw_feature_vector(player_id)
    neighbors = engine.similar_to_custom(vector, n=3)
    top = neighbors[0]
    ok = top["playerID"] == player_id and top["similarityScore"] >= 99
    all_passed &= ok
    status = "PASS" if ok else "FAIL"
    print(
        f"[{status}] seed={player_id!r:14} -> top comp={top['playerID']!r:14} "
        f"score={top['similarityScore']}"
    )

print()
print("ALL PASSED" if all_passed else "SOME FAILED")
assert all_passed
