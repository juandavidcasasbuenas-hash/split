"use client";
import { useStore } from "@/lib/store";
import { DRAFTING, DRAFTING_ORDER, effectiveDraftMul } from "@/lib/drafting";
import { PACING, PACING_ORDER } from "@/lib/pacing";
import { SURFACES, SURFACE_ORDER } from "@/lib/surface";

export function PacingLab() {
  const race = useStore((s) => s.race);
  const setSurface = useStore((s) => s.setSurface);
  const setDrafting = useStore((s) => s.setDrafting);
  const setPacing = useStore((s) => s.setPacing);
  const course = useStore((s) => s.course);
  const predA = useStore((s) => s.predictionA);

  if (!course) return null;

  return (
    <section className="border-b border-ink/70 grid-paper-fine">
      <div className="mx-auto max-w-[1400px] px-6 py-12 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow">Folio II · Pacing Lab</div>
            <div className="font-display text-3xl leading-tight md:text-4xl">
              How you ride it
            </div>
            <div className="mt-1 max-w-2xl text-sm text-graphite">
              Everything on-course: what you're rolling on, who you're rolling
              with, how you vary power by grade. Changes auto-rerun the
              prediction.
            </div>
          </div>
          <VIMeter
            vi={predA?.variabilityIndex ?? null}
            np={predA?.normalizedPower ?? null}
            ap={predA?.avgPower ?? null}
          />
        </div>

        {/* Surface — horizontal row */}
        <div className="mt-8">
          <div className="eyebrow mb-2">Road surface</div>
          <div className="grid grid-cols-2 gap-[1px] bg-ink/20 sm:grid-cols-3 lg:grid-cols-6">
            {SURFACE_ORDER.map((key) => {
              const s = SURFACES[key];
              const active = race.surface === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSurface(key)}
                  className={`px-3 py-3 text-left transition-colors ${
                    active ? "bg-ink text-paper" : "bg-paper hover:bg-paper2"
                  }`}
                  title={s.caption}
                >
                  <div className="text-[0.7rem] uppercase tracking-[0.12em] leading-tight">
                    {s.label}
                  </div>
                  <div
                    className={`font-mono text-[0.65rem] mono-nums ${
                      active ? "text-paper/70" : "text-graphite"
                    }`}
                  >
                    ×{s.crrMul.toFixed(2)} Crr
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-[0.7rem] text-graphite">
            {SURFACES[race.surface].caption}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <div className="eyebrow mb-2">Drafting</div>
            <div className="space-y-[1px] bg-ink/20">
              {DRAFTING_ORDER.map((key) => {
                const d = DRAFTING[key];
                const active = race.drafting === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDrafting(key)}
                    className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                      active
                        ? "bg-ink text-paper"
                        : "bg-paper hover:bg-paper2"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold tracking-wide">
                        {d.label}
                      </div>
                      <div
                        className={`text-xs ${
                          active ? "text-paper/70" : "text-graphite"
                        }`}
                      >
                        {d.caption}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <DraftingGraphic level={key} active={active} />
                      <div
                        className={`font-mono text-sm mono-nums ${
                          active ? "text-paper" : "text-ink"
                        }`}
                      >
                        ×{d.cdaMul.toFixed(2)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <DraftingTerrainNote baseMul={DRAFTING[race.drafting].cdaMul} />
          </div>

          <div>
            <div className="eyebrow mb-2">Pacing style</div>
            <div className="space-y-[1px] bg-ink/20">
              {PACING_ORDER.map((key) => {
                const p = PACING[key];
                const active = race.pacing === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPacing(key)}
                    className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                      active
                        ? "bg-ink text-paper"
                        : "bg-paper hover:bg-paper2"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold tracking-wide">
                        {p.label}
                      </div>
                      <div
                        className={`text-xs ${
                          active ? "text-paper/70" : "text-graphite"
                        }`}
                      >
                        {p.caption}
                      </div>
                    </div>
                    <div
                      className={`font-mono text-xs mono-nums ${
                        active ? "text-paper" : "text-graphite"
                      }`}
                    >
                      climb +{Math.round(p.climbBonus * 100)}% · descent −
                      {Math.round(p.descentRelief * 100)}%
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

function VIMeter({
  vi,
  np,
  ap,
}: {
  vi: number | null;
  np: number | null;
  ap: number | null;
}) {
  if (vi == null) {
    return (
      <div className="border border-ink/40 p-4">
        <div className="eyebrow">Variability Index</div>
        <div className="font-display text-4xl mono-nums text-graphite">—</div>
        <div className="text-xs text-graphite">Run prediction to compute</div>
      </div>
    );
  }
  const colored =
    vi < 1.04 ? "var(--tail)" : vi < 1.1 ? "var(--ochre)" : "var(--signal)";
  return (
    <div className="border border-ink p-4">
      <div className="eyebrow">Variability Index</div>
      <div
        className="font-display text-4xl mono-nums leading-none"
        style={{ color: colored }}
      >
        {vi.toFixed(3)}
      </div>
      <div className="mt-1 font-mono text-xs text-graphite mono-nums">
        NP {Math.round(np ?? 0)} W · AP {Math.round(ap ?? 0)} W
      </div>
    </div>
  );
}

function DraftingGraphic({
  level,
  active,
}: {
  level: "solo" | "wheel" | "group" | "peloton";
  active: boolean;
}) {
  const color = active ? "#F1EADB" : "#121821";
  const subColor = active ? "rgba(241,234,219,0.5)" : "rgba(18,24,33,0.4)";
  const circle = (cx: number, cy: number, main = false) => (
    <circle
      cx={cx}
      cy={cy}
      r="3"
      fill={main ? color : subColor}
    />
  );
  return (
    <svg width="54" height="14" viewBox="0 0 54 14">
      {level === "solo" && circle(27, 7, true)}
      {level === "wheel" && (
        <>
          {circle(18, 7)}
          {circle(36, 7, true)}
        </>
      )}
      {level === "group" && (
        <>
          {circle(9, 7)}
          {circle(21, 7)}
          {circle(33, 7)}
          {circle(45, 7, true)}
        </>
      )}
      {level === "peloton" && (
        <>
          {circle(4, 4)}
          {circle(4, 10)}
          {circle(14, 4)}
          {circle(14, 10)}
          {circle(24, 4)}
          {circle(24, 10)}
          {circle(34, 4)}
          {circle(34, 10)}
          {circle(44, 7, true)}
        </>
      )}
    </svg>
  );
}

function DraftingTerrainNote({ baseMul }: { baseMul: number }) {
  if (baseMul >= 0.999) {
    return (
      <div className="mt-3 text-xs text-graphite">
        No drafting benefit — pure solo effort everywhere.
      </div>
    );
  }
  // sample grades and show effective CdA mul
  const grades = [0, 2, 3, 4, 5];
  return (
    <div className="mt-3 border-l border-ink/30 pl-3">
      <div className="text-[0.65rem] uppercase tracking-[0.18em] text-graphite">
        terrain-gated benefit
      </div>
      <div className="mt-1 flex gap-3 font-mono text-xs text-ink mono-nums">
        {grades.map((g) => {
          const eff = effectiveDraftMul(baseMul, g);
          const active = eff < 0.999;
          return (
            <div key={g} className="flex flex-col items-center">
              <span
                style={{
                  color: active ? "var(--signal)" : "var(--graphite)",
                }}
              >
                {g}%
              </span>
              <span>×{eff.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-1 text-[0.7rem] text-graphite">
        Benefit ramps to zero between 2% and 5% grade — climbs splinter groups.
      </div>
    </div>
  );
}
