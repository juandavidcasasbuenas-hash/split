"use client";

export function PanelHeader({
  step,
  title,
  meta,
}: {
  step: string;
  title: string;
  meta?: string;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-ink/30 px-5 py-3">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs text-graphite">{step}</span>
        <span className="font-display text-lg leading-none">{title}</span>
      </div>
      <span className="text-[0.6rem] uppercase tracking-[0.22em] text-graphite">
        {meta ?? "input"}
      </span>
    </div>
  );
}
