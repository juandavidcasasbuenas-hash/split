"use client";
import { useStore } from "@/lib/store";
import { runPrediction } from "@/lib/runPrediction";

export function ActionBar() {
  const course = useStore((s) => s.course);
  const battleMode = useStore((s) => s.battleMode);
  const setBattleMode = useStore((s) => s.setBattleMode);
  const running = useStore((s) => s.running);
  const progressMessage = useStore((s) => s.progressMessage);

  if (!course) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4 md:pb-6">
      <div className="pointer-events-auto flex items-center gap-2 border border-ink bg-paper shadow-[4px_4px_0_var(--ink)]">
        <div className="flex divide-x divide-ink">
          <button
            type="button"
            onClick={() => setBattleMode(false)}
            className={`px-4 py-2 text-[0.7rem] uppercase tracking-[0.14em] transition-colors ${
              !battleMode ? "bg-ink text-paper" : "bg-paper hover:bg-paper2"
            }`}
          >
            Solo
          </button>
          <button
            type="button"
            onClick={() => setBattleMode(true)}
            className={`px-4 py-2 text-[0.7rem] uppercase tracking-[0.14em] transition-colors ${
              battleMode ? "bg-ink text-paper" : "bg-paper hover:bg-paper2"
            }`}
          >
            Battle ⚔
          </button>
        </div>

        <div className="hidden items-center gap-2 border-l border-ink px-3 text-[0.7rem] uppercase tracking-[0.14em] md:flex">
          {running ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
              </span>
              <span className="text-signal">{progressMessage || "Working"}</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-tail" />
              <span className="text-graphite">Live</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => void runPrediction({ forceWeather: true })}
          disabled={running}
          className="border-l border-ink px-4 py-2 text-[0.7rem] uppercase tracking-[0.14em] transition-colors hover:bg-paper2 disabled:opacity-40"
          title="Re-fetch weather + rerun everything"
        >
          ↻ Refresh
        </button>
      </div>
    </div>
  );
}

export function TopProgressBar() {
  const running = useStore((s) => s.running);
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[2px]"
    >
      <div
        className="h-full bg-signal transition-opacity duration-200"
        style={{
          opacity: running ? 1 : 0,
          width: "100%",
          backgroundImage:
            "linear-gradient(90deg, transparent, #C1432A, transparent)",
          animation: running ? "progress 1.2s linear infinite" : undefined,
        }}
      />
      <style jsx>{`
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
