// Display metadata for the raw feature columns returned by the API.
//
// Most counting stats in this dataset (AtBats, HomeRuns, Strikeouts, etc.)
// are PER-GAME rates, not season/career totals -- verified against real
// stat lines during data inspection (see engine.py's module docstring for
// the full derivation). They're labeled with a "/G" suffix here so nothing
// on screen reads like a season total that it isn't. BattingAverage,
// OnBasePercentage, SluggingPercentage and OpponentsBattingAverage are
// already true rate stats and need no suffix.
export const STAT_META = {
  AtBats: { label: "At-Bats", suffix: "/G", decimals: 2, group: "batting" },
  Runs: { label: "Runs", suffix: "/G", decimals: 2, group: "batting" },
  Hits: { label: "Hits", suffix: "/G", decimals: 2, group: "batting" },
  Doubles: { label: "Doubles", suffix: "/G", decimals: 2, group: "batting" },
  Triples: { label: "Triples", suffix: "/G", decimals: 2, group: "batting" },
  HomeRuns: { label: "Home Runs", suffix: "/G", decimals: 3, group: "batting" },
  RBI: { label: "RBI", suffix: "/G", decimals: 2, group: "batting" },
  StolenBasesAllowed_Batting: { label: "Stolen Bases", suffix: "/G", decimals: 3, group: "batting" },
  CaughtStealing: { label: "Caught Stealing", suffix: "/G", decimals: 3, group: "batting" },
  Walks: { label: "Walks", suffix: "/G", decimals: 2, group: "batting" },
  Strikeouts: { label: "Strikeouts", suffix: "/G", decimals: 2, group: "batting" },
  IntentionalWalks: { label: "Intentional Walks", suffix: "/G", decimals: 3, group: "batting" },
  HitsByPitch: { label: "Hit By Pitch", suffix: "/G", decimals: 3, group: "batting" },
  SacrificeHits: { label: "Sacrifice Hits", suffix: "/G", decimals: 3, group: "batting" },
  SacrificeFlies: { label: "Sacrifice Flies", suffix: "/G", decimals: 3, group: "batting" },
  GroundedIntoDoublePlay: { label: "GIDP", suffix: "/G", decimals: 3, group: "batting" },
  BattingAverage: { label: "Batting Average", suffix: "", decimals: 3, group: "rate" },
  OnBasePercentage: { label: "On-Base %", suffix: "", decimals: 3, group: "rate" },
  SluggingPercentage: { label: "Slugging %", suffix: "", decimals: 3, group: "rate" },

  yearID: { label: "Year", suffix: "", decimals: 0, group: "meta" },

  Putouts: { label: "Putouts", suffix: "/G", decimals: 2, group: "fielding" },
  Assists: { label: "Assists", suffix: "/G", decimals: 2, group: "fielding" },
  Errors: { label: "Errors", suffix: "/G", decimals: 3, group: "fielding" },
  DoublePlays: { label: "Double Plays", suffix: "/G", decimals: 3, group: "fielding" },
  PassedBalls: { label: "Passed Balls", suffix: "/G", decimals: 3, group: "fielding" },
  StolenBasesAllowed_Fielding: { label: "SB Allowed", suffix: "/G", decimals: 3, group: "fielding" },

  CompleteGames: { label: "Complete Games", suffix: "/G", decimals: 3, group: "pitching" },
  Shutouts: { label: "Shutouts", suffix: "/G", decimals: 3, group: "pitching" },
  Saves: { label: "Saves", suffix: "/G", decimals: 3, group: "pitching" },
  OutsPitched: { label: "Outs Pitched", suffix: "/G", decimals: 2, group: "pitching" },
  Hits_Pitching: { label: "Hits Allowed", suffix: "/G", decimals: 2, group: "pitching" },
  EarnedRuns: { label: "Earned Runs", suffix: "/G", decimals: 2, group: "pitching" },
  HomeRuns_Pitching: { label: "HR Allowed", suffix: "/G", decimals: 3, group: "pitching" },
  Walks_Pitching: { label: "Walks Issued", suffix: "/G", decimals: 2, group: "pitching" },
  Strikeouts_Pitching: { label: "Strikeouts", suffix: "/G", decimals: 2, group: "pitching" },
  EarnedRunAverage: { label: "ERA", suffix: "/G", decimals: 3, group: "rate" },
  IntentionalWalks_Pitching: { label: "Int. Walks Issued", suffix: "/G", decimals: 3, group: "pitching" },
  HitsByPitch_Pitching: { label: "Hit Batters", suffix: "/G", decimals: 3, group: "pitching" },
  Balks: { label: "Balks", suffix: "/G", decimals: 3, group: "pitching" },
  GamesFinished: { label: "Games Finished", suffix: "/G", decimals: 3, group: "pitching" },
  Runs_Pitching: { label: "Runs Allowed", suffix: "/G", decimals: 2, group: "pitching" },
  SacrificeHits_Pitching: { label: "Sac Hits Allowed", suffix: "/G", decimals: 3, group: "pitching" },
  SacrificeFlies_Pitching: { label: "Sac Flies Allowed", suffix: "/G", decimals: 3, group: "pitching" },
  GroundedIntoDoublePlay_Pitching: { label: "GIDP Induced", suffix: "/G", decimals: 3, group: "pitching" },
  OpponentsBattingAverage: { label: "Opp. Batting Avg", suffix: "", decimals: 3, group: "rate" },
};

export function formatStat(key, value) {
  if (value === null || value === undefined) return "—";
  const meta = STAT_META[key];
  if (!meta) return String(value);
  return `${value.toFixed(meta.decimals)}${meta.suffix}`;
}

export function statLabel(key) {
  return STAT_META[key]?.label ?? key;
}

// The dataset only stores per-game rates, not games-played counts, so a
// true season total can't be recovered exactly. For counting stats (not
// true rate stats like batting average), this projects an illustrative
// "season pace" over a reference 150-game season -- close to a typical
// qualifying regular-season workload -- clearly presented as a pace, with
// the real per-game rate always shown alongside it as the ground truth.
export const REFERENCE_SEASON_GAMES = 150;

export function seasonPace(key, value) {
  const meta = STAT_META[key];
  if (!meta || meta.group === "rate" || value === null || value === undefined) return null;
  return Math.round(value * REFERENCE_SEASON_GAMES);
}

// Curated headline stats shown on a scout card, by role. Full list is
// available on expand/hover -- the spec is explicit about not dumping all
// 54 numbers on a card.
export const KEY_BATTING_STATS = [
  "AtBats", "BattingAverage", "OnBasePercentage", "SluggingPercentage",
  "HomeRuns", "RBI", "StolenBasesAllowed_Batting", "Strikeouts",
];
export const KEY_PITCHING_STATS = [
  "OutsPitched", "EarnedRunAverage", "Strikeouts_Pitching", "Walks_Pitching",
  "Saves", "CompleteGames", "Shutouts", "OpponentsBattingAverage",
];

export function keyStatsFor(position) {
  return position === "P" ? KEY_PITCHING_STATS : KEY_BATTING_STATS;
}
