"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { Profile } from "./Profile";
import { SegmentTable } from "./SegmentTable";
import { SensitivityPanel } from "./SensitivityPanel";

type Tab = "profile" | "ledger" | "sensitivity";

const TABS: Array<{ id: Tab; label: string; hint: string }> = [
  { id: "profile", label: "Profile & Speed", hint: "Elevation + speed + wind" },
  { id: "ledger", label: "Segment Ledger", hint: "Chunked power & time rows" },
  {
    id: "sensitivity",
    label: "Sensitivity",
    hint: "±5% factor perturbations",
  },
];

export function Analysis() {
  const [tab, setTab] = useState<Tab>("profile");
  const predA = useStore((s) => s.predictionA);
  if (!predA) return null;

  return (
    <section className="border-b border-ink/70 bg-paper2/30">
      <div className="mx-auto max-w-[1400px] px-6 py-12 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
          <div>
            <div className="eyebrow">Folio · Analysis</div>
            <div className="font-display text-3xl leading-tight md:text-4xl">
              Read the detail
            </div>
          </div>
          <nav className="flex flex-wrap border border-ink">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 text-left transition-colors ${
                    active ? "bg-ink text-paper" : "bg-paper hover:bg-paper2"
                  }`}
                  title={t.hint}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.12em]">
                    {t.label}
                  </div>
                  <div
                    className={`text-[0.65rem] ${
                      active ? "text-paper/60" : "text-graphite"
                    }`}
                  >
                    {t.hint}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "profile" && <Profile />}
            {tab === "ledger" && <SegmentTable />}
            {tab === "sensitivity" && <SensitivityPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
