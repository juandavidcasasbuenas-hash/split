"use client";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { CourseLoaderHero } from "./CourseLoader";

export function Hero() {
  const course = useStore((s) => s.course);
  // Once a course is loaded the floating PredictionBar takes over the top of
  // the viewport. Hero only renders the welcome/empty state.
  if (course) return null;

  return (
    <section className="relative overflow-hidden border-b border-ink/80 grid-paper">
      <div className="mx-auto max-w-[1400px] px-6 py-12 md:px-10 md:py-16">
        <div>
          <div className="flex items-center justify-between">
            <div className="eyebrow">Folio I · Test File</div>
            <div className="eyebrow hidden md:block">No course loaded</div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.2, 0.65, 0.2, 1] }}
            className="mt-6 max-w-3xl"
          >
            <h1
              className="font-display leading-[0.9] tracking-tight-er text-ink"
              style={{
                fontSize: "clamp(3.6rem, 9vw, 7rem)",
                fontWeight: 400,
                fontVariationSettings: "'opsz' 144",
              }}
            >
              Predict any{" "}
              <em className="not-italic text-signal">bike split</em> — physics,
              weather, uncertainty.
            </h1>
            <p className="mt-5 max-w-xl text-base text-graphite md:text-lg">
              Drop a GPX, set a rider, pick your pacing. We solve the forces
              per segment, pull hyperlocal weather, run 120-sample Monte Carlo
              for uncertainty, and let an LLM propose a sustainable plan.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mt-8"
          >
            <CourseLoaderHero />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
