import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Setup } from "./components/Setup";
import { PacingLab } from "./components/PacingLab";
import { RaceReplay } from "./components/RaceReplay";
import { Analysis } from "./components/Analysis";
import { AutoRun } from "./components/AutoRun";
import { ActionBar, TopProgressBar } from "./components/ActionBar";
import { PredictionBar } from "./components/PredictionBar";

export default function Page() {
  return (
    <main className="relative z-0">
      <TopProgressBar />
      <AutoRun />
      <PredictionBar />
      <Header />
      <Hero />
      <Setup />
      <PacingLab />
      <RaceReplay />
      <Analysis />
      <footer className="bg-paper py-10 pb-24 md:pb-28">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-baseline justify-between gap-4 px-6 md:px-10">
          <div className="font-display text-lg">
            Split<span className="text-signal">.</span>
          </div>
          <div className="font-mono text-xs text-graphite">
            Physics · Ensemble weather · Uncertainty · AI pacing
          </div>
          <div className="text-xs text-graphite">
            Open-Meteo · Gemini · No third-party athlete accounts required
          </div>
        </div>
      </footer>
      <ActionBar />
    </main>
  );
}
