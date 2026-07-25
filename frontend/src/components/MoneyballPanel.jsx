const STAT_LABEL = {
  OBP: "on-base percentage",
  BA: "batting average",
  SLG: "slugging",
  BB: "walk rate",
};

export default function MoneyballPanel({ moneyball, name, position }) {
  if (!moneyball) return null;
  const { flagged } = moneyball;

  return (
    <aside
      aria-label="Moneyball signal"
      className={`rounded-2xl border px-5 py-4 font-serif text-sm ${
        flagged
          ? "border-clay/40 bg-clay/10 text-chalk"
          : "border-chalk/15 bg-chalk/5 text-cream/70"
      }`}
    >
      <p>{buildCopy(name, moneyball, position)}</p>
    </aside>
  );
}

// A pure function of the player's own percentiles, not a fixed template --
// picking a bucket by overall level and a phrasing variant by a hash of
// the actual numbers means two different players landing in the same
// bucket still don't read identically, and the same player always gets
// the same sentence (deterministic, not random-per-render).
function buildCopy(name, moneyball, position) {
  const { flagged, obpPercentile, baPercentile, slgPercentile, bbPercentile, standoutStat, weakestStat } =
    moneyball;

  const hash = Math.round(obpPercentile + baPercentile + slgPercentile + bbPercentile);
  const pick = (variants) => variants[hash % variants.length];

  // Pitchers rarely bat, so most of them tie at (or near) zero on every
  // batting rate stat -- which otherwise lands as a deceptively high
  // percentile purely because ~2,200 other pitchers are tied there too.
  // That's a real artifact (verified: Kershaw and a random reliever both
  // showed 81.7 across all four stats identically), not a batting
  // strength worth complimenting, so pitchers get an honest note instead
  // of the batter commentary.
  if (position === "P") {
    return pick([
      <>
        {name} is scouted here on pitching, not hitting -- OBP, batting average, and
        slugging mostly reflect that pitchers rarely bat, not this player's actual skill.
      </>,
      <>
        Batting rate stats aren't diagnostic for a pitcher. {name}'s case for a comp lives
        in the pitching lines, not these percentiles.
      </>,
    ]);
  }

  if (flagged) {
    return pick([
      <>
        <strong className="font-heading uppercase tracking-wide text-clay-light">
          Market inefficiency:
        </strong>{" "}
        {name}'s on-base percentage sits in the {ordinal(obpPercentile)} percentile, well
        ahead of a {ordinal(baPercentile)}-percentile batting average. The market
        undervalued this.
      </>,
      <>
        {name} gets on base like a {ordinal(obpPercentile)}-percentile hitter but only
        hits for average like a {ordinal(baPercentile)}-percentile one. That gap is the
        whole Moneyball thesis in one player.
      </>,
      <>
        Batting average ({ordinal(baPercentile)} percentile) undersells {name} badly.
        Walks and on-base skill push the real number to the {ordinal(obpPercentile)}{" "}
        percentile.
      </>,
    ]);
  }

  const avg = (obpPercentile + baPercentile + slgPercentile + bbPercentile) / 4;
  const standoutLabel = STAT_LABEL[standoutStat];
  const weakestLabel = STAT_LABEL[weakestStat];
  const standoutPct = moneyball[`${standoutStat.toLowerCase()}Percentile`];
  const weakestPct = moneyball[`${weakestStat.toLowerCase()}Percentile`];

  if (avg >= 80) {
    return pick([
      <>
        {name} doesn't have a weak spot here: {standoutLabel} leads at the{" "}
        {ordinal(standoutPct)} percentile, and even the softest number ({weakestLabel}) is
        still {ordinal(weakestPct)}.
      </>,
      <>
        Elite across the board. {name}'s {weakestLabel} is the "weak" one here and it's
        still {ordinal(weakestPct)} percentile.
      </>,
    ]);
  }

  if (avg <= 25) {
    return pick([
      <>
        {name} doesn't stand out on rate stats. {standoutLabel} is the high point, at the{" "}
        {ordinal(standoutPct)} percentile, which is still modest league-wide.
      </>,
      <>
        A quiet stat line. Nothing here cracks the top half of the league, {standoutLabel}
        included at the {ordinal(standoutPct)} percentile.
      </>,
    ]);
  }

  return pick([
    <>
      {name}'s calling card is {standoutLabel}, {ordinal(standoutPct)} percentile.{" "}
      {weakestLabel} lags furthest behind, at the {ordinal(weakestPct)}.
    </>,
    <>
      OBP ({ordinal(obpPercentile)} percentile) and batting average ({ordinal(baPercentile)}{" "}
      percentile) move together for {name}. No hidden value in that gap: {standoutLabel} is
      where this profile actually separates.
    </>,
  ]);
}

function ordinal(pct) {
  const n = Math.round(pct);
  const suffix = ["th", "st", "nd", "rd"][n % 10 > 3 || Math.floor((n % 100) / 10) === 1 ? 0 : n % 10] || "th";
  return `${n}${suffix}`;
}
