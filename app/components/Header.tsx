"use client";
import { foliaNumber } from "@/lib/util";

export function Header() {
  return (
    <header className="relative border-b border-ink/90 bg-paper">
      <div className="mx-auto flex max-w-[1400px] items-end justify-between px-6 py-5 md:px-10">
        <div className="flex items-baseline gap-4">
          <div className="flex h-9 w-9 items-center justify-center border border-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="6" cy="18" r="4.2" stroke="#121821" strokeWidth="1.5" />
              <circle cx="18" cy="18" r="4.2" stroke="#121821" strokeWidth="1.5" />
              <path
                d="M6 18 L11 10 L16 10 L18 18 M11 10 L13 6 L15 6"
                stroke="#C1432A"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div
              className="font-display text-[2.3rem] leading-none tracking-tight-er"
              style={{ fontWeight: 500, fontVariationSettings: "'opsz' 144" }}
            >
              Split<span className="text-signal">.</span>
            </div>
            <div className="mt-1 text-[0.7rem] uppercase tracking-[0.22em] text-graphite">
              Race Engineer's Notebook
            </div>
          </div>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <span className="stamp">{foliaNumber()}</span>
          <span className="stamp" style={{ borderColor: "var(--signal)", color: "var(--signal)" }}>
            Prediction Build
          </span>
        </div>
      </div>
      <div className="h-[2px] bg-ink" />
      <div className="h-[1px] bg-ink/60 mt-[2px]" />
    </header>
  );
}
