"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, SLOT_COLORS } from "@/lib/store";
import type { RiderSlot } from "@/lib/store";
import { fmtTime, fmtBand, fmtDelta, windLabel } from "@/lib/util";
import { SwapCourseButton } from "./CourseLoader";

export function PredictionBar() {
  const course = useStore((s) => s.course);
  const battleMode = useStore((s) => s.battleMode);
  const predA = useStore((s) => s.predictionA);
  const predB = useStore((s) => s.predictionB);
  const predC = useStore((s) => s.predictionC);
  const statsA = useStore((s) => s.statsA);
  const statsB = useStore((s) => s.statsB);
  const statsC = useStore((s) => s.statsC);
  const nameA = useStore((s) => s.riderNameA);
  const nameB = useStore((s) => s.riderNameB);
  const nameC = useStore((s) => s.riderNameC);
  const weather = useStore((s) => s.weather);
  const running = useStore((s) => s.running);

  if (!course) return null;

  const tA = predA ? statsA?.median ?? predA.totalTime : null;
  const tB = predB ? statsB?.median ?? predB.totalTime : null;
  const tC = predC ? statsC?.median ?? predC.totalTime : null;

  const firstWeather = weather?.points[0];
  const conditions = firstWeather
    ? `${firstWeather.temperature[0].toFixed(0)}°C · ${firstWeather.windspeed[0].toFixed(1)} m/s ${windLabel(firstWeather.winddir[0])}`
    : null;

  const battleReady = battleMode && tA !== null && tB !== null && tC !== null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center px-3 pt-3 md:pt-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.2, 0.65, 0.2, 1] }}
        className="pointer-events-auto max-w-[96vw] border border-ink bg-paper shadow-[4px_4px_0_var(--ink)]"
      >
        {battleReady ? (
          <BattleBar
            riders={[
              { slot: "A", name: nameA, time: tA! },
              { slot: "B", name: nameB, time: tB! },
              { slot: "C", name: nameC, time: tC! },
            ]}
            course={course.name}
            distanceKm={course.totalDistance / 1000}
          />
        ) : (
          <SoloBar
            time={tA}
            stats={statsA}
            course={course.name}
            distanceKm={course.totalDistance / 1000}
            ascentM={course.totalAscent}
            conditions={conditions}
            running={running}
          />
        )}
      </motion.div>
    </div>
  );
}

function SoloBar({
  time,
  stats,
  course,
  distanceKm,
  ascentM,
  conditions,
  running,
}: {
  time: number | null;
  stats: { p10: number; p90: number } | null;
  course: string;
  distanceKm: number;
  ascentM: number;
  conditions: string | null;
  running: boolean;
}) {
  const timeStr = time != null ? fmtTime(time) : "—:—:—";
  return (
    <div className="flex items-stretch divide-x divide-ink">
      <div className="hidden min-w-[180px] flex-col justify-center px-4 py-2 md:flex">
        <div className="eyebrow text-[0.6rem]">Course</div>
        <div className="font-display text-sm leading-tight">{course}</div>
        <div className="font-mono text-[0.7rem] text-graphite mono-nums">
          {distanceKm.toFixed(1)} km · {Math.round(ascentM)} m ↑
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 md:px-5">
        <div
          className="font-display leading-none tracking-tight-er mono-nums"
          style={{
            fontSize: "clamp(1.7rem, 5vw, 2.4rem)",
            fontWeight: 400,
            fontVariationSettings: "'opsz' 144",
          }}
        >
          <AnimatePresence mode="popLayout">
            <motion.span
              key={timeStr}
              initial={{ opacity: 0.4, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="inline-block"
            >
              {timeStr.split(":").map((grp, i, arr) => (
                <span key={i}>
                  <span>{grp}</span>
                  {i < arr.length - 1 && (
                    <span className="text-signal">:</span>
                  )}
                </span>
              ))}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="flex flex-col items-start">
          <div className="eyebrow text-[0.55rem]">Band</div>
          <div className="font-mono text-[0.85rem] text-ink mono-nums">
            {stats ? fmtBand(stats.p10, stats.p90) : "—"}
          </div>
        </div>
      </div>

      <div className="hidden items-center px-4 py-2 md:flex">
        <div className="flex flex-col">
          <div className="eyebrow text-[0.55rem]">Conditions</div>
          <div className="font-mono text-[0.8rem] text-ink mono-nums">
            {conditions ?? "—"}
          </div>
        </div>
      </div>

      <div className="flex items-center px-3 py-2">
        <SwapCourseButton />
      </div>
    </div>
  );
}

interface BattleEntry {
  slot: RiderSlot;
  name: string;
  time: number;
}

function BattleBar({
  riders,
  course,
  distanceKm,
}: {
  riders: BattleEntry[];
  course: string;
  distanceKm: number;
}) {
  const sorted = [...riders].sort((a, b) => a.time - b.time);
  const winner = sorted[0];
  const winnerColor = SLOT_COLORS[winner.slot];
  return (
    <div className="flex items-stretch divide-x divide-ink">
      <div className="hidden min-w-[180px] flex-col justify-center px-4 py-2 md:flex">
        <div className="eyebrow text-[0.6rem]">Battle</div>
        <div className="font-display text-sm leading-tight">{course}</div>
        <div className="font-mono text-[0.7rem] text-graphite mono-nums">
          {distanceKm.toFixed(1)} km
        </div>
      </div>

      <div className="flex items-stretch divide-x divide-ink">
        {sorted.map((r, i) => {
          const color = SLOT_COLORS[r.slot];
          const gap = r.time - winner.time;
          const isWinner = i === 0;
          return (
            <div
              key={r.slot}
              className="flex flex-col items-start justify-center px-3 py-2 md:px-4"
              style={{ minWidth: 130 }}
            >
              <div className="flex items-baseline gap-2">
                <span
                  className="text-[0.55rem] uppercase tracking-[0.18em] mono-nums"
                  style={{ color: "rgba(18,24,33,0.55)" }}
                >
                  {i + 1}
                </span>
                <span
                  className="text-[0.55rem] uppercase tracking-[0.16em]"
                  style={{ color }}
                >
                  {r.name}
                </span>
              </div>
              <div
                className="font-display leading-none mono-nums"
                style={{
                  fontSize: "clamp(1.2rem, 3.4vw, 1.7rem)",
                  fontWeight: 400,
                  opacity: isWinner ? 1 : 0.7,
                }}
              >
                {fmtTime(r.time)}
              </div>
              {!isWinner && (
                <div
                  className="mt-0.5 font-mono text-[0.7rem] mono-nums"
                  style={{ color: "rgba(18,24,33,0.6)" }}
                >
                  +{fmtDelta(gap).replace("+", "")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="hidden items-center px-3 py-2 md:flex">
        <span
          className="stamp"
          style={{
            borderColor: winnerColor,
            color: winnerColor,
            fontSize: "0.55rem",
            padding: "0.2rem 0.5rem",
          }}
        >
          {winner.name} wins
        </span>
      </div>

      <div className="flex items-center px-3 py-2">
        <SwapCourseButton />
      </div>
    </div>
  );
}
