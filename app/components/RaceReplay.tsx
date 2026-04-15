"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { buildTrajectory, sampleAt, type TrajPoint } from "@/lib/trajectory";
import { fmtTime, fmtDelta } from "@/lib/util";

const RED = "#C1432A";
const BLUE = "#2B6E8A";

export function RaceReplay() {
  const duel = useStore((s) => s.duelMode);
  const predA = useStore((s) => s.predictionA);
  const predB = useStore((s) => s.predictionB);
  const course = useStore((s) => s.course);
  const nameA = useStore((s) => s.riderNameA);
  const nameB = useStore((s) => s.riderNameB);

  const trajA = useMemo(
    () => (predA ? buildTrajectory(predA, 0.5) : null),
    [predA],
  );
  const trajB = useMemo(
    () => (predB ? buildTrajectory(predB, 0.5) : null),
    [predB],
  );

  const Ttotal = useMemo(() => {
    if (!predA || !predB) return 0;
    return Math.max(predA.totalTime, predB.totalTime);
  }, [predA, predB]);

  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(64);
  const [celebrated, setCelebrated] = useState(false);
  const [view, setView] = useState<"map" | "profile">("profile");

  // Reset and auto-play when a new duel result arrives
  useEffect(() => {
    if (predA && predB) {
      setT(0);
      setCelebrated(false);
      setPlaying(true);
    }
  }, [predA, predB]);

  useEffect(() => {
    if (!playing || Ttotal === 0) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setT((prev) => {
        const next = prev + dt * speed;
        if (next >= Ttotal) {
          setPlaying(false);
          return Ttotal;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, Ttotal]);

  // trigger celebration when first rider finishes
  const firstFinishT = useMemo(
    () => (predA && predB ? Math.min(predA.totalTime, predB.totalTime) : 0),
    [predA, predB],
  );
  useEffect(() => {
    if (!celebrated && firstFinishT > 0 && t >= firstFinishT) {
      setCelebrated(true);
    }
  }, [t, firstFinishT, celebrated]);

  if (!duel || !predA || !predB || !trajA || !trajB || !course) return null;

  const posA = sampleAt(trajA, t);
  const posB = sampleAt(trajB, t);
  const winnerA = predA.totalTime < predB.totalTime;
  const winnerName = winnerA ? nameA : nameB;
  const winnerColor = winnerA ? RED : BLUE;
  const finalGap = Math.abs(predA.totalTime - predB.totalTime);

  // Live gap: spatial (km) and time (how long ago the leader was at trailer's km)
  const gapKm = posA.km - posB.km;
  const aAhead = gapKm > 0;
  const leaderTraj = aAhead ? trajA : trajB;
  const trailerKm = aAhead ? posB.km : posA.km;
  const timeGap = Math.max(
    0,
    t - timeAtKm(leaderTraj, trailerKm),
  );
  const aFinished = t >= predA.totalTime;
  const bFinished = t >= predB.totalTime;

  return (
    <section className="relative overflow-hidden border-b border-ink/70 bg-ink text-paper">
      <div className="mx-auto max-w-[1400px] px-6 py-12 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div
              className="eyebrow"
              style={{ color: "rgba(241,234,219,0.6)" }}
            >
              Folio III · Race Replay
            </div>
            <div className="font-display text-3xl leading-tight md:text-4xl">
              Duel <span style={{ color: RED }}>{nameA}</span>{" "}
              <span style={{ color: "rgba(241,234,219,0.5)" }}>vs.</span>{" "}
              <span style={{ color: BLUE }}>{nameB}</span>
            </div>
          </div>
          <LiveGap
            aAhead={aAhead}
            timeGap={timeGap}
            gapKm={Math.abs(gapKm)}
            nameA={nameA}
            nameB={nameB}
            finished={t >= Ttotal}
            winnerName={winnerName}
            winnerColor={winnerColor}
            finalGap={finalGap}
          />
        </div>

        {/* View toggle */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 border border-paper/40">
            {(["profile", "map"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.18em] transition-colors ${
                  view === v
                    ? "bg-paper text-ink"
                    : "text-paper hover:bg-paper/10"
                }`}
              >
                {v === "profile" ? "Elevation" : "Map"}
              </button>
            ))}
          </div>
          {view === "profile" && <GradeLegend />}
        </div>

        {/* View */}
        <div className="mt-3 relative">
          {view === "map" ? (
            <MapView
              course={course}
              trajA={trajA}
              trajB={trajB}
              posA={posA}
              posB={posB}
              t={t}
            />
          ) : (
            <ProfileView
              course={course}
              trajA={trajA}
              trajB={trajB}
              posA={posA}
              posB={posB}
              t={t}
            />
          )}
          <AnimatePresence>
            {celebrated && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <div
                  className="border-2 px-8 py-4 bg-ink/80 backdrop-blur-sm"
                  style={{ borderColor: winnerColor }}
                >
                  <div
                    className="text-[0.7rem] uppercase tracking-[0.3em]"
                    style={{ color: winnerColor }}
                  >
                    🏁 First to finish
                  </div>
                  <div
                    className="font-display text-4xl leading-none"
                    style={{ color: winnerColor }}
                  >
                    {winnerName}
                  </div>
                  <div className="mt-1 font-mono text-xs text-paper/70 mono-nums">
                    winning split {fmtTime(
                      winnerA ? predA.totalTime : predB.totalTime,
                    )}{" "}
                    · margin {fmtDelta(finalGap).replace("+", "")}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Live stats cards */}
        <div className="mt-6 grid grid-cols-1 gap-[1px] border border-paper/20 bg-paper/20 md:grid-cols-2">
          <RiderCard
            name={nameA}
            color={RED}
            pos={posA}
            finished={aFinished}
            totalTime={predA.totalTime}
            totalKm={predA.distanceKm}
          />
          <RiderCard
            name={nameB}
            color={BLUE}
            pos={posB}
            finished={bFinished}
            totalTime={predB.totalTime}
            totalKm={predB.distanceKm}
          />
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => {
              if (t >= Ttotal) setT(0);
              setPlaying((p) => !p);
            }}
            className="flex h-11 w-11 items-center justify-center border-2 border-paper text-paper transition-colors hover:bg-paper hover:text-ink"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <svg width="14" height="14" viewBox="0 0 14 14">
                <rect x="2" y="1" width="3.5" height="12" fill="currentColor" />
                <rect x="8.5" y="1" width="3.5" height="12" fill="currentColor" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14">
                <polygon points="2,1 2,13 12,7" fill="currentColor" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-[200px]">
            <input
              type="range"
              min={0}
              max={Ttotal}
              step={0.5}
              value={t}
              onChange={(e) => {
                setPlaying(false);
                setT(parseFloat(e.target.value));
              }}
              className="w-full accent-[#C1432A]"
            />
            <div className="mt-1 flex justify-between font-mono text-xs text-paper/70 mono-nums">
              <span>{fmtTime(t)}</span>
              <span>{fmtTime(Ttotal)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 border border-paper/40">
            {[16, 64, 256].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 text-xs font-mono mono-nums transition-colors ${
                  speed === s
                    ? "bg-paper text-ink"
                    : "text-paper hover:bg-paper/10"
                }`}
              >
                {s}×
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setT(Ttotal);
              }}
              className="px-2 py-1 text-xs font-mono text-paper hover:bg-paper/10"
              title="Jump to finish"
            >
              ∞
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setT(0);
              setPlaying(true);
            }}
            className="text-xs uppercase tracking-[0.14em] text-paper/70 hover:text-paper"
          >
            ↺ Restart
          </button>
        </div>
      </div>

      {/* ambient backdrop lines */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #F1EADB 1px, transparent 1px), linear-gradient(to bottom, #F1EADB 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
    </section>
  );
}

function LiveGap({
  aAhead,
  timeGap,
  gapKm,
  nameA,
  nameB,
  finished,
  winnerName,
  winnerColor,
  finalGap,
}: {
  aAhead: boolean;
  timeGap: number;
  gapKm: number;
  nameA: string;
  nameB: string;
  finished: boolean;
  winnerName: string;
  winnerColor: string;
  finalGap: number;
}) {
  const leader = aAhead ? nameA : nameB;
  const color = aAhead ? RED : BLUE;
  if (finished) {
    return (
      <div
        className="border-2 px-5 py-3"
        style={{ borderColor: winnerColor }}
      >
        <div
          className="text-[0.6rem] uppercase tracking-[0.3em]"
          style={{ color: winnerColor }}
        >
          Final result
        </div>
        <div className="font-display text-2xl">
          <span style={{ color: winnerColor }}>{winnerName}</span>{" "}
          <span className="text-paper/70">wins by</span>{" "}
          <span className="mono-nums">{fmtDelta(finalGap).replace("+", "")}</span>
        </div>
      </div>
    );
  }
  if (gapKm < 0.01) {
    return (
      <div className="border border-paper/40 px-5 py-3">
        <div
          className="text-[0.6rem] uppercase tracking-[0.3em]"
          style={{ color: "rgba(241,234,219,0.6)" }}
        >
          Neck and neck
        </div>
        <div className="font-display text-2xl">Dead level</div>
      </div>
    );
  }
  return (
    <div
      className="border-2 px-5 py-3"
      style={{ borderColor: color }}
    >
      <div
        className="text-[0.6rem] uppercase tracking-[0.3em]"
        style={{ color }}
      >
        {leader} leads by
      </div>
      <div className="font-display text-2xl" style={{ color }}>
        <span className="mono-nums">{fmtTime(timeGap)}</span>{" "}
        <span className="text-base text-paper/70 mono-nums">
          · {gapKm.toFixed(2)} km
        </span>
      </div>
    </div>
  );
}

function RiderCard({
  name,
  color,
  pos,
  finished,
  totalTime,
  totalKm,
}: {
  name: string;
  color: string;
  pos: TrajPoint;
  finished: boolean;
  totalTime: number;
  totalKm: number;
}) {
  const progress = Math.min(1, pos.km / Math.max(0.01, totalKm));
  return (
    <div className="bg-ink/90 p-4">
      <div className="flex items-center justify-between">
        <div
          className="text-[0.65rem] uppercase tracking-[0.22em]"
          style={{ color }}
        >
          {name}
        </div>
        {finished && (
          <span
            className="stamp"
            style={{
              borderColor: color,
              color,
              fontSize: "0.55rem",
              padding: "0.15rem 0.4rem",
            }}
          >
            Finished {fmtTime(totalTime)}
          </span>
        )}
      </div>
      <div className="mt-1 grid grid-cols-4 gap-3">
        <Stat label="km" value={pos.km.toFixed(2)} />
        <Stat label="speed" value={`${(pos.v * 3.6).toFixed(1)}`} unit="km/h" />
        <Stat label="power" value={Math.round(pos.power).toString()} unit="W" />
        <Stat label="ele" value={Math.round(pos.ele).toString()} unit="m" />
      </div>
      <div className="mt-3 h-1 bg-paper/20">
        <div
          className="h-full"
          style={{
            width: `${progress * 100}%`,
            background: color,
            transition: "width 0.1s linear",
          }}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div>
      <div
        className="text-[0.55rem] uppercase tracking-[0.2em]"
        style={{ color: "rgba(241,234,219,0.55)" }}
      >
        {label}
      </div>
      <div className="font-mono text-base mono-nums">
        {value}{" "}
        {unit && <span className="text-[0.65rem] text-paper/60">{unit}</span>}
      </div>
    </div>
  );
}

function MapView({
  course,
  trajA,
  trajB,
  posA,
  posB,
  t,
}: {
  course: NonNullable<ReturnType<typeof useStore.getState>["course"]>;
  trajA: TrajPoint[];
  trajB: TrajPoint[];
  posA: TrajPoint;
  posB: TrajPoint;
  t: number;
}) {
  const { bbox } = course;
  const W = 1000;
  const H = 480;
  const pad = 40;
  const lonSpan = Math.max(1e-9, bbox.maxLon - bbox.minLon);
  const latSpan = Math.max(1e-9, bbox.maxLat - bbox.minLat);
  const aspect = lonSpan / latSpan;
  const innerW = W - pad * 2;
  const innerH = H - pad * 2;
  let pw = innerW;
  let ph = innerW / aspect;
  if (ph > innerH) {
    ph = innerH;
    pw = innerH * aspect;
  }
  const ox = pad + (innerW - pw) / 2;
  const oy = pad + (innerH - ph) / 2;
  const project = (lat: number, lon: number) => ({
    x: ox + ((lon - bbox.minLon) / lonSpan) * pw,
    y: oy + ph - ((lat - bbox.minLat) / latSpan) * ph,
  });

  const coursePath = course.segments
    .map((s, i) => {
      const { x, y } = project(s.lat, s.lon);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const trailPath = (traj: TrajPoint[]) => {
    // binary search for last index with t <= current t
    let lo = 0;
    let hi = traj.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (traj[mid].t <= t) lo = mid;
      else hi = mid;
    }
    const cutoff = Math.max(0, traj[lo].t <= t ? lo + 1 : 0);
    if (cutoff === 0) return "";
    return traj
      .slice(0, cutoff)
      .map((p, i) => {
        const { x, y } = project(p.lat, p.lon);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const pA = project(posA.lat, posA.lon);
  const pB = project(posB.lat, posB.lon);
  const start = project(
    course.segments[0].lat,
    course.segments[0].lon,
  );

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="block h-auto w-full border border-paper/30"
      >
        {/* radial vignette */}
        <defs>
          <radialGradient id="vig" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#1E2836" stopOpacity="1" />
            <stop offset="100%" stopColor="#121821" stopOpacity="1" />
          </radialGradient>
          <filter id="glowA" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="url(#vig)" />

        {/* course outline ghost */}
        <path
          d={coursePath}
          stroke="rgba(241,234,219,0.22)"
          fill="none"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="1 3"
        />

        {/* trails */}
        <path
          d={trailPath(trajA)}
          stroke={RED}
          fill="none"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d={trailPath(trajB)}
          stroke={BLUE}
          fill="none"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* start marker */}
        <circle
          cx={start.x}
          cy={start.y}
          r="8"
          fill="none"
          stroke="#F1EADB"
          strokeWidth="1.5"
        />
        <circle cx={start.x} cy={start.y} r="2" fill="#F1EADB" />
        <text
          x={start.x + 12}
          y={start.y + 4}
          fontSize="10"
          fill="#F1EADB"
          fontFamily="var(--font-mono)"
        >
          START
        </text>

        {/* rider dots */}
        <motion.g animate={{ cx: pA.x, cy: pA.y }}>
          <circle cx={pA.x} cy={pA.y} r="16" fill={RED} opacity="0.18" />
          <circle cx={pA.x} cy={pA.y} r="10" fill={RED} opacity="0.35" />
          <circle
            cx={pA.x}
            cy={pA.y}
            r="5.5"
            fill={RED}
            filter="url(#glowA)"
          />
        </motion.g>
        <motion.g animate={{ cx: pB.x, cy: pB.y }}>
          <circle cx={pB.x} cy={pB.y} r="16" fill={BLUE} opacity="0.18" />
          <circle cx={pB.x} cy={pB.y} r="10" fill={BLUE} opacity="0.35" />
          <circle cx={pB.x} cy={pB.y} r="5.5" fill={BLUE} />
        </motion.g>

        {/* compass */}
        <g transform={`translate(${W - 60}, ${H - 60})`}>
          <circle
            cx="0"
            cy="0"
            r="22"
            fill="none"
            stroke="rgba(241,234,219,0.4)"
          />
          <line
            x1="0"
            y1="-18"
            x2="0"
            y2="18"
            stroke="rgba(241,234,219,0.4)"
          />
          <text
            x="0"
            y="-24"
            fontSize="10"
            textAnchor="middle"
            fill="#F1EADB"
            fontFamily="var(--font-mono)"
          >
            N
          </text>
        </g>
      </svg>
    </div>
  );
}

/**
 * Gradient-coloured elevation profile with rider dots tracking position along
 * the course. Each segment rendered as a coloured polygon under the curve.
 */
function ProfileView({
  course,
  trajA,
  trajB,
  posA,
  posB,
  t,
}: {
  course: NonNullable<ReturnType<typeof useStore.getState>["course"]>;
  trajA: TrajPoint[];
  trajB: TrajPoint[];
  posA: TrajPoint;
  posB: TrajPoint;
  t: number;
}) {
  const W = 1000;
  const H = 420;
  const pad = { l: 50, r: 16, t: 20, b: 40 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  const totalKm = course.totalDistance / 1000;
  const eleMin = course.minEle;
  const eleMax = course.maxEle;
  const eleSpan = Math.max(10, eleMax - eleMin);
  // give some headroom so the top isn't clipped
  const eleMinR = eleMin - eleSpan * 0.05;
  const eleMaxR = eleMax + eleSpan * 0.05;
  const eleSpanR = eleMaxR - eleMinR;

  const xAt = (km: number) => pad.l + (km / totalKm) * innerW;
  const yAt = (ele: number) =>
    pad.t + innerH - ((ele - eleMinR) / eleSpanR) * innerH;
  const yBase = pad.t + innerH;

  // Build per-segment polygons
  const segs = course.segments;
  // prepend a virtual starting point at (0 km, segs[0].ele) for the first polygon
  let prevX = xAt(0);
  let prevY = yAt(segs[0].ele);
  const polys: Array<{ d: string; color: string }> = [];
  for (const s of segs) {
    const x = xAt(s.cumDist / 1000);
    const y = yAt(s.ele);
    const color = gradeColor(s.grade * 100);
    const d = `M ${prevX.toFixed(1)},${yBase} L ${prevX.toFixed(1)},${prevY.toFixed(1)} L ${x.toFixed(1)},${y.toFixed(1)} L ${x.toFixed(1)},${yBase} Z`;
    polys.push({ d, color });
    prevX = x;
    prevY = y;
  }

  // Elevation outline (ink line over the coloured fills)
  const outline =
    `M ${xAt(0).toFixed(1)},${yAt(segs[0].ele).toFixed(1)} ` +
    segs
      .map(
        (s) => `L ${xAt(s.cumDist / 1000).toFixed(1)},${yAt(s.ele).toFixed(1)}`,
      )
      .join(" ");

  // Trails = polylines along (km, ele) up to current t for each rider
  const trailPath = (traj: TrajPoint[]) => {
    let lo = 0;
    let hi = traj.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (traj[mid].t <= t) lo = mid;
      else hi = mid;
    }
    const cutoff = Math.max(0, traj[lo].t <= t ? lo + 1 : 0);
    if (cutoff === 0) return "";
    return traj
      .slice(0, cutoff)
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${xAt(p.km).toFixed(1)},${yAt(p.ele).toFixed(1)}`,
      )
      .join(" ");
  };

  const dotA = { x: xAt(posA.km), y: yAt(posA.ele) };
  const dotB = { x: xAt(posB.km), y: yAt(posB.ele) };

  // x-axis ticks
  const nTicks = 6;
  const xTicks = Array.from({ length: nTicks + 1 }, (_, i) =>
    Math.round((i * totalKm) / nTicks),
  );
  // y-axis ticks
  const yTickCount = 4;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) =>
    Math.round(eleMinR + (i * eleSpanR) / yTickCount),
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="block h-auto w-full border border-paper/30 bg-ink2"
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* fine grid */}
      <g stroke="rgba(241,234,219,0.07)" strokeWidth="0.5">
        {yTicks.map((_, i) => {
          const y = pad.t + (i * innerH) / yTickCount;
          return (
            <line
              key={`gy${i}`}
              x1={pad.l}
              x2={W - pad.r}
              y1={y}
              y2={y}
            />
          );
        })}
        {xTicks.map((_, i) => {
          const x = pad.l + (i * innerW) / nTicks;
          return (
            <line
              key={`gx${i}`}
              y1={pad.t}
              y2={yBase}
              x1={x}
              x2={x}
            />
          );
        })}
      </g>

      {/* coloured segment polygons */}
      {polys.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} opacity="0.9" />
      ))}
      <path d={outline} stroke="rgba(241,234,219,0.75)" strokeWidth="1" fill="none" />

      {/* axes */}
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={yBase} stroke="rgba(241,234,219,0.5)" />
      <line x1={pad.l} y1={yBase} x2={W - pad.r} y2={yBase} stroke="rgba(241,234,219,0.5)" />

      {/* x labels */}
      {xTicks.map((v, i) => {
        const x = pad.l + (i * innerW) / nTicks;
        return (
          <g key={`xt${i}`}>
            <line x1={x} x2={x} y1={yBase} y2={yBase + 3} stroke="rgba(241,234,219,0.5)" />
            <text
              x={x}
              y={yBase + 16}
              fontSize="10"
              fontFamily="var(--font-mono)"
              fill="rgba(241,234,219,0.6)"
              textAnchor="middle"
            >
              {v} km
            </text>
          </g>
        );
      })}
      {/* y labels */}
      {yTicks.map((v, i) => {
        const y = pad.t + innerH - (i * innerH) / yTickCount;
        return (
          <g key={`yt${i}`}>
            <line x1={pad.l - 3} x2={pad.l} y1={y} y2={y} stroke="rgba(241,234,219,0.5)" />
            <text
              x={pad.l - 6}
              y={y + 3}
              fontSize="10"
              fontFamily="var(--font-mono)"
              fill="rgba(241,234,219,0.6)"
              textAnchor="end"
            >
              {v}
            </text>
          </g>
        );
      })}
      <text
        x={pad.l - 6}
        y={pad.t - 6}
        fontSize="9"
        fontFamily="var(--font-mono)"
        fill="rgba(241,234,219,0.5)"
        textAnchor="end"
      >
        m
      </text>

      {/* rider trails */}
      <path
        d={trailPath(trajA)}
        stroke={RED}
        fill="none"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.95"
      />
      <path
        d={trailPath(trajB)}
        stroke={BLUE}
        fill="none"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.95"
      />

      {/* vertical guides from dots to baseline */}
      <line
        x1={dotA.x}
        x2={dotA.x}
        y1={dotA.y}
        y2={yBase}
        stroke={RED}
        strokeDasharray="2 3"
        opacity="0.4"
      />
      <line
        x1={dotB.x}
        x2={dotB.x}
        y1={dotB.y}
        y2={yBase}
        stroke={BLUE}
        strokeDasharray="2 3"
        opacity="0.4"
      />

      {/* rider dots */}
      <g>
        <circle cx={dotA.x} cy={dotA.y} r="14" fill={RED} opacity="0.18" />
        <circle cx={dotA.x} cy={dotA.y} r="8" fill={RED} opacity="0.35" />
        <circle cx={dotA.x} cy={dotA.y} r="5" fill={RED} filter="url(#glow)" />
      </g>
      <g>
        <circle cx={dotB.x} cy={dotB.y} r="14" fill={BLUE} opacity="0.18" />
        <circle cx={dotB.x} cy={dotB.y} r="8" fill={BLUE} opacity="0.35" />
        <circle cx={dotB.x} cy={dotB.y} r="5" fill={BLUE} />
      </g>
    </svg>
  );
}

const GRADE_BANDS: Array<{ range: string; color: string; label: string }> = [
  { range: "≥12%", color: "#8A1F10", label: "wall" },
  { range: "6–12%", color: "#C1432A", label: "steep climb" },
  { range: "2–6%", color: "#B48A3C", label: "climb" },
  { range: "±2%", color: "#4A5362", label: "flat" },
  { range: "−2 to −6%", color: "#70955C", label: "descent" },
  { range: "−6 to −12%", color: "#486B4E", label: "steep descent" },
];

function gradeColor(gradePct: number): string {
  if (gradePct >= 12) return "#8A1F10";
  if (gradePct >= 6) return "#C1432A";
  if (gradePct >= 2) return "#B48A3C";
  if (gradePct > -2) return "#4A5362";
  if (gradePct > -6) return "#70955C";
  if (gradePct > -12) return "#486B4E";
  return "#2D4530";
}

function GradeLegend() {
  return (
    <div className="hidden flex-wrap items-center gap-2 text-[0.6rem] uppercase tracking-[0.12em] text-paper/60 md:flex">
      {GRADE_BANDS.map((b) => (
        <div key={b.range} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-4"
            style={{ background: b.color }}
            aria-hidden
          />
          <span className="mono-nums">{b.range}</span>
        </div>
      ))}
    </div>
  );
}

// Given a trajectory (monotonic in km), find the time at which rider was at `km`.
function timeAtKm(traj: TrajPoint[], km: number): number {
  if (traj.length === 0) return 0;
  if (km <= traj[0].km) return traj[0].t;
  if (km >= traj[traj.length - 1].km) return traj[traj.length - 1].t;
  let lo = 0;
  let hi = traj.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (traj[mid].km <= km) lo = mid;
    else hi = mid;
  }
  const a = traj[lo];
  const b = traj[hi];
  const span = Math.max(1e-6, b.km - a.km);
  const w = (km - a.km) / span;
  return a.t + w * (b.t - a.t);
}
