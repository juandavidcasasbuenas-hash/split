"use client";
import { useStore } from "@/lib/store";
import { fmtTime, windLabel } from "@/lib/util";
import { useMemo } from "react";

export function SegmentTable() {
  const prediction = useStore((s) => s.predictionA);

  const rollup = useMemo(() => {
    if (!prediction) return null;
    // Aggregate into ~2 km ledger rows for readability
    const segs = prediction.perSegment;
    const total = segs[segs.length - 1].segment.cumDist;
    const targetRows = Math.min(20, Math.max(8, Math.round(total / 2000)));
    const stepDist = total / targetRows;
    const rows = [] as Array<{
      kmStart: number;
      kmEnd: number;
      time: number;
      speed: number;
      power: number;
      grade: number;
      wind: number;
      windDir: number;
    }>;
    let bucket = {
      dist: 0,
      t: 0,
      powerT: 0,
      gradeDist: 0,
      windT: 0,
      dirSinT: 0,
      dirCosT: 0,
      startKm: 0,
      eleStart: 0,
      eleEnd: 0,
    };
    let cursor = 0;
    let rowStartKm = 0;
    for (const r of segs) {
      if (bucket.dist === 0) {
        rowStartKm = (r.segment.cumDist - r.segment.dist) / 1000;
        bucket.eleStart = r.segment.ele;
      }
      bucket.dist += r.segment.dist;
      bucket.t += r.t;
      bucket.powerT += r.power * r.t;
      bucket.gradeDist += r.segment.grade * r.segment.dist;
      bucket.windT += r.windParallel * r.t;
      const dirRad = (r.windDir * Math.PI) / 180;
      bucket.dirSinT += Math.sin(dirRad) * r.t;
      bucket.dirCosT += Math.cos(dirRad) * r.t;
      bucket.eleEnd = r.segment.ele;
      if (bucket.dist >= stepDist || r === segs[segs.length - 1]) {
        const avgDir =
          (Math.atan2(bucket.dirSinT, bucket.dirCosT) * 180) / Math.PI;
        rows.push({
          kmStart: rowStartKm,
          kmEnd: r.segment.cumDist / 1000,
          time: bucket.t,
          speed: (bucket.dist / bucket.t) * 3.6,
          power: bucket.powerT / bucket.t,
          grade: bucket.gradeDist / bucket.dist,
          wind: bucket.windT / bucket.t,
          windDir: (avgDir + 360) % 360,
        });
        bucket = {
          dist: 0,
          t: 0,
          powerT: 0,
          gradeDist: 0,
          windT: 0,
          dirSinT: 0,
          dirCosT: 0,
          startKm: 0,
          eleStart: 0,
          eleEnd: 0,
        };
      }
      cursor++;
    }
    return rows;
  }, [prediction]);

  if (!rollup || !prediction) return null;

  const maxPower = Math.max(...rollup.map((r) => r.power));
  const minPower = Math.min(...rollup.map((r) => r.power));

  return (
    <div>
      <div className="flex items-baseline justify-between pb-4">
        <div className="text-sm text-graphite">
          Time-weighted power, speed, and wind at each course chunk.
        </div>
        <div className="hidden font-mono text-xs text-graphite md:block mono-nums">
          {rollup.length} rows · ~{(prediction.distanceKm / rollup.length).toFixed(1)} km each
        </div>
      </div>

      <div className="overflow-x-auto border border-ink">
          <table className="w-full min-w-[720px] border-collapse font-mono text-sm">
            <thead>
              <tr className="border-b border-ink bg-ink text-paper">
                <Th>Segment</Th>
                <Th>Distance</Th>
                <Th>Split</Th>
                <Th>Speed</Th>
                <Th>Power</Th>
                <Th>Grade</Th>
                <Th>Wind</Th>
              </tr>
            </thead>
            <tbody>
              {rollup.map((r, i) => {
                const powerNorm =
                  maxPower === minPower
                    ? 0.5
                    : (r.power - minPower) / (maxPower - minPower);
                return (
                  <tr
                    key={i}
                    className="border-b border-ink/20 hover:bg-paper"
                  >
                    <Td mono>
                      {r.kmStart.toFixed(1)} → {r.kmEnd.toFixed(1)}
                    </Td>
                    <Td mono>{(r.kmEnd - r.kmStart).toFixed(1)} km</Td>
                    <Td mono>{fmtTime(r.time)}</Td>
                    <Td mono>{r.speed.toFixed(1)} km/h</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-[6px] w-[60px] border border-ink/30"
                          aria-hidden
                        >
                          <div
                            className="h-full bg-ink"
                            style={{ width: `${powerNorm * 100}%` }}
                          />
                        </div>
                        <span className="mono-nums">{Math.round(r.power)} W</span>
                      </div>
                    </Td>
                    <Td mono>
                      <span
                        className={
                          r.grade > 0.01
                            ? "text-ink"
                            : r.grade < -0.01
                            ? "text-tail"
                            : "text-graphite"
                        }
                      >
                        {(r.grade * 100).toFixed(1)}%
                      </span>
                    </Td>
                    <Td mono>
                      <span
                        className={r.wind > 0 ? "text-signal" : "text-tail"}
                      >
                        {r.wind >= 0 ? "↑" : "↓"}{" "}
                        {Math.abs(r.wind).toFixed(1)} m/s
                      </span>{" "}
                      <span className="text-graphite">
                        {windLabel(r.windDir)}
                      </span>
                    </Td>
                  </tr>
                );
              })}
              <tr className="bg-paper2 font-bold">
                <Td mono>TOTAL</Td>
                <Td mono>{prediction.distanceKm.toFixed(1)} km</Td>
                <Td mono>{fmtTime(prediction.totalTime)}</Td>
                <Td mono>{prediction.avgSpeedKmh.toFixed(1)} km/h</Td>
                <Td mono>
                  {Math.round(prediction.avgPower)} / {Math.round(prediction.normalizedPower)} NP
                </Td>
                <Td>—</Td>
                <Td>—</Td>
              </tr>
            </tbody>
          </table>
        </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-[0.65rem] uppercase tracking-[0.16em]">
      {children}
    </th>
  );
}
function Td({
  children,
  mono,
}: {
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <td
      className={`px-3 py-2 ${
        mono ? "font-mono mono-nums" : ""
      } align-middle`}
    >
      {children}
    </td>
  );
}
