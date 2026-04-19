"use client";
import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { runPrediction } from "@/lib/runPrediction";

/**
 * Invisible orchestrator:
 *  - On course load or start-time change: fetches weather + full prediction
 *  - On other knob changes (rider, surface, drafting, pacing, battle): fast
 *    physics-only rerun using cached weather, debounced 350ms
 */
export function AutoRun() {
  const course = useStore((s) => s.course);
  const startIso = useStore((s) => s.race.startIso);
  const riderA = useStore((s) => s.riderA);
  const riderB = useStore((s) => s.riderB);
  const riderC = useStore((s) => s.riderC);
  const surface = useStore((s) => s.race.surface);
  const drafting = useStore((s) => s.race.drafting);
  const pacing = useStore((s) => s.race.pacing);
  const customClimbBonus = useStore((s) => s.race.customClimbBonus);
  const customDescentRelief = useStore((s) => s.race.customDescentRelief);
  const battleMode = useStore((s) => s.battleMode);

  // Full run whenever the course swaps or start time moves
  const lastCourseKey = useRef<string | null>(null);
  useEffect(() => {
    if (!course) return;
    const key = `${course.name}|${course.totalDistance.toFixed(0)}|${startIso}`;
    if (lastCourseKey.current === key) return;
    lastCourseKey.current = key;
    void runPrediction({ forceWeather: true });
  }, [course, startIso]);

  // Debounced quick rerun on light knob changes (cached weather)
  useEffect(() => {
    if (!course) return;
    const t = setTimeout(() => {
      void runPrediction({ forceWeather: false });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    riderA,
    riderB,
    riderC,
    surface,
    drafting,
    pacing,
    customClimbBonus,
    customDescentRelief,
    battleMode,
  ]);

  return null;
}
