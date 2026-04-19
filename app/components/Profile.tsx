"use client";
import { useStore, SLOT_COLORS } from "@/lib/store";
import { useMemo, useState } from "react";

export function Profile() {
  const course = useStore((s) => s.course);
  const prediction = useStore((s) => s.predictionA);
  const predictionB = useStore((s) => s.predictionB);
  const predictionC = useStore((s) => s.predictionC);
  const battleMode = useStore((s) => s.battleMode);
  const [hover, setHover] = useState<number | null>(null);

  const data = useMemo(() => {
    if (!course || !prediction) return null;
    const segs = prediction.perSegment;
    const dists = segs.map((r) => r.segment.cumDist / 1000);
    const eles = segs.map((r) => r.segment.ele);
    const speeds = segs.map((r) => r.v * 3.6);
    const winds = segs.map((r) => r.windParallel);
    const powers = segs.map((r) => r.power);
    const speedsB =
      battleMode && predictionB
        ? predictionB.perSegment.map((r) => r.v * 3.6)
        : null;
    const speedsC =
      battleMode && predictionC
        ? predictionC.perSegment.map((r) => r.v * 3.6)
        : null;
    const extras = [speedsB, speedsC].filter(
      (x): x is number[] => x !== null,
    );
    const allSpeedsMin = Math.min(
      ...speeds,
      ...extras.flatMap((s) => s),
    );
    const allSpeedsMax = Math.max(
      ...speeds,
      ...extras.flatMap((s) => s),
    );
    return {
      dists,
      eles,
      speeds,
      speedsB,
      speedsC,
      winds,
      powers,
      distMax: dists[dists.length - 1],
      eleMin: Math.min(...eles),
      eleMax: Math.max(...eles),
      speedMin: allSpeedsMin,
      speedMax: allSpeedsMax,
      windMax: Math.max(5, ...winds.map(Math.abs)),
    };
  }, [course, prediction, predictionB, predictionC, battleMode]);

  if (!data || !prediction) {
    return (
      <div className="border border-dashed border-ink/30 p-12 text-center">
        <div className="font-display text-2xl text-graphite">
          Elevation, wind, and predicted speed will plot here.
        </div>
      </div>
    );
  }

  // layout
  const W = 1200;
  const H = 420;
  const padL = 56;
  const padR = 56;
  const padT = 30;
  const padB = 76;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const xAt = (d: number) => padL + (d / data.distMax) * innerW;
  const eleSpan = Math.max(10, data.eleMax - data.eleMin);
  const yEle = (e: number) =>
    padT + innerH - ((e - data.eleMin) / eleSpan) * innerH;

  const speedSpan = Math.max(1, data.speedMax - data.speedMin);
  const ySpeed = (s: number) =>
    padT + innerH - ((s - data.speedMin) / speedSpan) * innerH;

  // elevation polygon
  const eleArea =
    `M ${xAt(0)},${yEle(data.eleMin)} ` +
    data.dists
      .map((d, i) => `L ${xAt(d)},${yEle(data.eles[i])}`)
      .join(" ") +
    ` L ${xAt(data.distMax)},${yEle(data.eleMin)} Z`;

  const eleLine = data.dists
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xAt(d)},${yEle(data.eles[i])}`)
    .join(" ");

  const speedLine = data.dists
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xAt(d)},${ySpeed(data.speeds[i])}`)
    .join(" ");

  const speedLineB = data.speedsB
    ? data.dists
        .map(
          (d, i) =>
            `${i === 0 ? "M" : "L"} ${xAt(d)},${ySpeed(data.speedsB![i])}`,
        )
        .join(" ")
    : null;

  const speedLineC = data.speedsC
    ? data.dists
        .map(
          (d, i) =>
            `${i === 0 ? "M" : "L"} ${xAt(d)},${ySpeed(data.speedsC![i])}`,
        )
        .join(" ")
    : null;

  // wind band below
  const windY0 = H - padB + 20;
  const windH = 28;
  const windBars = data.winds.map((w, i) => {
    const x = xAt(data.dists[i]);
    const norm = Math.max(-1, Math.min(1, w / data.windMax));
    const h = Math.abs(norm) * (windH / 2);
    const y = norm > 0 ? windY0 : windY0 - h;
    const color = norm > 0 ? "#C1432A" : "#486B4E";
    const barW = Math.max(1.2, innerW / data.dists.length);
    return (
      <rect
        key={i}
        x={x - barW / 2}
        y={y}
        width={barW}
        height={h}
        fill={color}
        opacity={0.85}
      />
    );
  });

  // x-axis tick marks
  const nTicks = 6;
  const ticks = Array.from({ length: nTicks + 1 }, (_, i) =>
    Math.round((i * data.distMax) / nTicks),
  );

  // elevation ticks
  const eTickCount = 4;
  const eTicks = Array.from({ length: eTickCount + 1 }, (_, i) =>
    Math.round(data.eleMin + (i * eleSpan) / eTickCount),
  );

  const hoverSeg = hover !== null ? prediction.perSegment[hover] : null;

  return (
    <div>
      <div className="flex items-end justify-between pb-4">
        <div className="text-sm text-graphite">
          Hover the profile to read segment values; toggle legend items for
          reference.
        </div>
        <div className="hidden gap-4 md:flex">
          <LegendDot color="#121821" label="Elevation" line />
          <LegendDot color={SLOT_COLORS.A} label={battleMode ? "Rider A speed" : "Predicted speed"} line />
          {battleMode && predictionB && (
            <LegendDot color={SLOT_COLORS.B} label="Rider B speed" line />
          )}
          {battleMode && predictionC && (
            <LegendDot color={SLOT_COLORS.C} label="Rider C speed" line />
          )}
          <LegendDot color="#C1432A" label="Headwind" />
          <LegendDot color="#486B4E" label="Tailwind" />
        </div>
      </div>

      <div className="corner-marks border border-ink">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            className="block h-auto w-full noise"
            onMouseLeave={() => setHover(null)}
            onMouseMove={(e) => {
              const rect = (e.target as SVGElement)
                .closest("svg")!
                .getBoundingClientRect();
              const xPx = e.clientX - rect.left;
              const xVB = (xPx / rect.width) * W;
              if (xVB < padL || xVB > W - padR) {
                setHover(null);
                return;
              }
              const dist = ((xVB - padL) / innerW) * data.distMax;
              let idx = 0;
              let bestDd = Infinity;
              data.dists.forEach((d, i) => {
                const dd = Math.abs(d - dist);
                if (dd < bestDd) {
                  bestDd = dd;
                  idx = i;
                }
              });
              setHover(idx);
            }}
          >
            {/* fine grid */}
            <g stroke="rgba(18,24,33,0.08)" strokeWidth="0.5">
              {eTicks.map((_, i) => {
                const y = padT + (i * innerH) / eTickCount;
                return (
                  <line
                    key={`gy${i}`}
                    x1={padL}
                    x2={W - padR}
                    y1={y}
                    y2={y}
                  />
                );
              })}
              {ticks.map((_, i) => {
                const x = padL + (i * innerW) / nTicks;
                return (
                  <line
                    key={`gx${i}`}
                    y1={padT}
                    y2={H - padB}
                    x1={x}
                    x2={x}
                  />
                );
              })}
            </g>

            {/* elevation area */}
            <path d={eleArea} fill="rgba(18,24,33,0.09)" />
            <path d={eleLine} fill="none" stroke="#121821" strokeWidth="1.1" />

            {/* speed lines */}
            <path
              d={speedLine}
              fill="none"
              stroke="#C1432A"
              strokeWidth="1.4"
            />
            {speedLineB && (
              <path
                d={speedLineB}
                fill="none"
                stroke={SLOT_COLORS.B}
                strokeWidth="1.4"
                strokeDasharray="3 2"
              />
            )}
            {speedLineC && (
              <path
                d={speedLineC}
                fill="none"
                stroke={SLOT_COLORS.C}
                strokeWidth="1.4"
                strokeDasharray="1 2"
              />
            )}

            {/* axes */}
            <line
              x1={padL}
              y1={padT}
              x2={padL}
              y2={H - padB}
              stroke="#121821"
            />
            <line
              x1={padL}
              y1={H - padB}
              x2={W - padR}
              y2={H - padB}
              stroke="#121821"
            />

            {/* right axis = speed */}
            <line
              x1={W - padR}
              y1={padT}
              x2={W - padR}
              y2={H - padB}
              stroke="#C1432A"
              strokeWidth="0.8"
            />

            {/* x labels */}
            {ticks.map((t, i) => {
              const x = padL + (i * innerW) / nTicks;
              return (
                <g key={`xt${i}`}>
                  <line
                    x1={x}
                    x2={x}
                    y1={H - padB}
                    y2={H - padB + 4}
                    stroke="#121821"
                  />
                  <text
                    x={x}
                    y={H - padB + 18}
                    fontSize="10"
                    fontFamily="var(--font-mono)"
                    fill="#5A6374"
                    textAnchor="middle"
                  >
                    {t} km
                  </text>
                </g>
              );
            })}

            {/* y labels */}
            {eTicks.map((e, i) => {
              const y = padT + innerH - (i * innerH) / eTickCount;
              return (
                <g key={`yt${i}`}>
                  <line
                    x1={padL - 4}
                    x2={padL}
                    y1={y}
                    y2={y}
                    stroke="#121821"
                  />
                  <text
                    x={padL - 8}
                    y={y + 3}
                    fontSize="10"
                    fontFamily="var(--font-mono)"
                    fill="#5A6374"
                    textAnchor="end"
                  >
                    {e}
                  </text>
                </g>
              );
            })}
            <text
              x={padL - 8}
              y={padT - 8}
              fontSize="9"
              textAnchor="end"
              fontFamily="var(--font-mono)"
              fill="#5A6374"
            >
              m
            </text>

            {/* speed axis labels */}
            {(() => {
              const sTicks = [
                data.speedMin,
                (data.speedMin + data.speedMax) / 2,
                data.speedMax,
              ];
              return sTicks.map((s, i) => {
                const y = ySpeed(s);
                return (
                  <g key={`st${i}`}>
                    <line
                      x1={W - padR}
                      x2={W - padR + 4}
                      y1={y}
                      y2={y}
                      stroke="#C1432A"
                    />
                    <text
                      x={W - padR + 8}
                      y={y + 3}
                      fontSize="10"
                      fontFamily="var(--font-mono)"
                      fill="#C1432A"
                    >
                      {s.toFixed(0)}
                    </text>
                  </g>
                );
              });
            })()}
            <text
              x={W - padR + 8}
              y={padT - 8}
              fontSize="9"
              fontFamily="var(--font-mono)"
              fill="#C1432A"
            >
              km/h
            </text>

            {/* wind band */}
            <g>
              <line
                x1={padL}
                x2={W - padR}
                y1={windY0}
                y2={windY0}
                stroke="#121821"
                strokeWidth="0.6"
              />
              {windBars}
              <text
                x={padL - 8}
                y={windY0 + 3}
                fontSize="9"
                textAnchor="end"
                fontFamily="var(--font-mono)"
                fill="#5A6374"
              >
                wind
              </text>
            </g>

            {/* hover cursor */}
            {hoverSeg && (
              <g>
                <line
                  x1={xAt(hoverSeg.segment.cumDist / 1000)}
                  x2={xAt(hoverSeg.segment.cumDist / 1000)}
                  y1={padT}
                  y2={H - padB}
                  stroke="#121821"
                  strokeDasharray="2 3"
                />
                <circle
                  cx={xAt(hoverSeg.segment.cumDist / 1000)}
                  cy={yEle(hoverSeg.segment.ele)}
                  r="3.5"
                  fill="#121821"
                />
                <circle
                  cx={xAt(hoverSeg.segment.cumDist / 1000)}
                  cy={ySpeed(hoverSeg.v * 3.6)}
                  r="3.5"
                  fill="#C1432A"
                />
              </g>
            )}
          </svg>
        </div>

        {hoverSeg ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-ink/30 pt-3 font-mono text-sm mono-nums">
            <span className="text-graphite">
              km {(hoverSeg.segment.cumDist / 1000).toFixed(1)}
            </span>
            <span>ele {Math.round(hoverSeg.segment.ele)} m</span>
            <span>grade {(hoverSeg.segment.grade * 100).toFixed(1)}%</span>
            <span>speed {(hoverSeg.v * 3.6).toFixed(1)} km/h</span>
            <span>power {Math.round(hoverSeg.power)} W</span>
            <span
              className={
                hoverSeg.windParallel > 0 ? "text-signal" : "text-tail"
              }
            >
              {hoverSeg.windParallel >= 0 ? "head" : "tail"}{" "}
              {Math.abs(hoverSeg.windParallel).toFixed(1)} m/s
            </span>
          </div>
        ) : (
          <div className="mt-4 text-xs text-graphite">
            Hover the profile for segment detail.
          </div>
        )}
    </div>
  );
}

function LegendDot({
  color,
  label,
  line,
}: {
  color: string;
  label: string;
  line?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-graphite">
      {line ? (
        <span className="block h-[2px] w-5" style={{ background: color }} />
      ) : (
        <span className="block h-2 w-2" style={{ background: color }} />
      )}
      {label}
    </div>
  );
}
