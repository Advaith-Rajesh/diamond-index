import { Route, Routes } from "react-router-dom";
import Nav from "./components/Nav";
import Landing from "./pages/Landing";
import FindMyGuy from "./pages/FindMyGuy";
import BuildBallplayer from "./pages/BuildBallplayer";
import HeadToHead from "./pages/HeadToHead";

export default function App() {
  return (
    <div className="min-h-svh text-chalk">
      <div className="grain-overlay" aria-hidden="true" />
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/player/:playerId" element={<FindMyGuy />} />
          <Route path="/build" element={<BuildBallplayer />} />
          <Route path="/compare" element={<HeadToHead />} />
        </Routes>
      </main>
      <footer className="mx-auto max-w-6xl px-6 pb-10 pt-6 sm:px-10">
        <div className="chalk-rule" />
        <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-cream/40">
          The Diamond Index · Data window 2015–2022 · Not affiliated with MLB
        </p>
      </footer>
    </div>
  );
}
