"use client";
import { useStore } from "@/lib/store";
import { fmtDelta } from "@/lib/util";

export function SensitivityPanel() {
  const sensitivity = useStore((s) => s.sensitivity);
  const stats = useStore((s) => s.statsA);
  const prediction = useStore((s) => s.predictionA);
  if (!sensitivity || !prediction) return null;

  const band = stats ? stats.p90 - stats.p10 : 0;
  const maxAbs = Math.max(
    ...sensitivity.map((s) => Math.abs(s.deltaSeconds)),
    60,
  );

  return (
    <div>
      <div className="flex items-baseline justify-between pb-4">
        <div className="text-sm text-graphite">
          Time delta versus baseline for one-factor-at-a-time perturbations.
        </div>
        <div className="hidden text-right md:block">
          <div className="eyebrow">Uncertainty band</div>
          <div className="font-mono text-lg mono-nums">
            {Math.round(band)} s wide
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {sensitivity.map((s) => {
            const norm = s.deltaSeconds / maxAbs;
            const width = Math.abs(norm) * 50;
            const fromCenter = 50;
            const slower = s.deltaSeconds > 0;
            return (
              <div
                key={s.label}
                className="border border-ink/40 bg-paper px-4 py-3"
              >
                <div className="flex items-baseline justify-between">
                  <div className="font-display text-lg leading-tight">
                    {s.label}
                  </div>
                  <div
                    className={`font-mono text-sm mono-nums ${
                      slower ? "text-signal" : "text-tail"
                    }`}
                  >
                    {fmtDelta(s.deltaSeconds)}
                  </div>
                </div>
                <div className="mt-1 text-xs text-graphite">
                  {s.description}
                </div>
                {/* center-anchored bar */}
                <div className="mt-3 h-2 border border-ink/20 bg-paper2/60">
                  <div className="relative h-full w-full">
                    <div
                      className="absolute top-0 h-full"
                      style={{
                        left: `${slower ? fromCenter : fromCenter - width}%`,
                        width: `${width}%`,
                        background: slower ? "#C1432A" : "#486B4E",
                      }}
                    />
                    <div className="absolute left-1/2 top-[-2px] h-[calc(100%+4px)] w-[1px] bg-ink" />
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
