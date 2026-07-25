import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPlayer, getSimilar } from "../api";
import Loading from "../components/Loading";
import MoneyballPanel from "../components/MoneyballPanel";
import ScoutCard from "../components/ScoutCard";
import PlayerSearch from "../components/PlayerSearch";
import EmptyState from "../components/EmptyState";
import Reveal from "../components/Reveal";

export default function FindMyGuy() {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [similar, setSimilar] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPlayer(null);
    setSimilar(null);

    Promise.all([getPlayer(playerId), getSimilar(playerId, 5)])
      .then(([playerData, similarData]) => {
        if (cancelled) return;
        setPlayer(playerData);
        setSimilar(similarData);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [playerId]);

  return (
    <div>
      <div className="max-w-xl">
        <PlayerSearch
          label="FIND ANOTHER PLAYER"
          onSelect={(p) => navigate(`/player/${p.playerID}`)}
        />
      </div>

      {loading && <Loading label={`Pulling ${playerId}'s file…`} />}

      {error && <EmptyState query={playerId} />}

      {player && similar && (
        <div className="mt-8">
          <p className="font-mono text-xs uppercase tracking-widest text-cream/50">
            Query Player
          </p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-chalk">
            {player.name}
          </h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-wider text-cream/50">
            {player.primaryPosition} · {player.season} season · {player.era} · Scout ID{" "}
            {player.playerID}
          </p>

          <div className="mt-4 max-w-xl">
            <MoneyballPanel
              moneyball={player.moneyball}
              name={player.name}
              position={player.primaryPosition}
            />
          </div>

          <p className="mt-8 font-mono text-xs uppercase tracking-widest text-cream/50">
            {similar.scoreExplainer}
          </p>

          <div className="mt-4 space-y-4">
            {similar.neighbors.map((neighbor, i) => (
              <Reveal key={neighbor.playerID} delay={i * 90}>
                <ScoutCard neighbor={neighbor} rank={i + 1} />
              </Reveal>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
