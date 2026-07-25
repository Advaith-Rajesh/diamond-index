const BASE = "/api";

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function searchPlayers(query) {
  return request(`/players?q=${encodeURIComponent(query)}`);
}

export function getPlayer(playerId) {
  return request(`/player/${encodeURIComponent(playerId)}`);
}

// Full-precision 54-feature vector (includes the hidden 'index'/ZoneRating
// columns) -- used only to seed Build a Ballplayer, never displayed.
export function getPlayerVector(playerId) {
  return request(`/player/${encodeURIComponent(playerId)}/vector`);
}

export function getSimilar(playerId, n = 6) {
  return request(`/similar/${encodeURIComponent(playerId)}?n=${n}`);
}

export function getSimilarCustom(stats, n = 6) {
  return request(`/similar/custom`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stats, n }),
  });
}

export function getRandomPlayer() {
  return request(`/random`);
}

export function getSliderConfig() {
  return request(`/sliders`);
}

export function getHeadToHead(playerIdA, playerIdB) {
  return request(
    `/head-to-head?a=${encodeURIComponent(playerIdA)}&b=${encodeURIComponent(playerIdB)}`
  );
}
