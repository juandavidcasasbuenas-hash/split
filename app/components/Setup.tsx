"use client";
import { useStore } from "@/lib/store";
import { RiderPanel } from "./RiderPanel";
import { RaceDayPanel } from "./RaceDayPanel";

/**
 * Setup — Rider + Start Time. Course is in the Hero, course-condition knobs
 * (surface / drafting / pacing) are in the Pacing Lab. Only renders once a
 * course is loaded, so empty-state pages stay focused on the call-to-action.
 */
export function Setup() {
  const course = useStore((s) => s.course);
  if (!course) return null;

  return (
    <section className="border-b border-ink/70 bg-paper">
      <div className="mx-auto max-w-[1400px] px-6 pb-10 pt-14 md:px-10 md:pb-14 md:pt-20">
        <div className="flex items-baseline justify-between pb-4">
          <div>
            <div className="eyebrow">Folio I · Plan</div>
            <div className="font-display text-3xl leading-tight md:text-4xl">
              Who's racing & when
            </div>
          </div>
          <div className="eyebrow hidden md:block">tweak anywhere — auto-updates</div>
        </div>

        <div className="grid grid-cols-1 gap-[1px] border border-ink bg-ink lg:grid-cols-[2fr_1fr]">
          <div className="bg-paper">
            <RiderPanel />
          </div>
          <div className="bg-paper">
            <RaceDayPanel />
          </div>
        </div>
      </div>
    </section>
  );
}
