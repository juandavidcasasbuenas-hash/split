"use client";
import { useEffect, useRef, useState } from "react";

function format(v: number, decimals: number): string {
  if (!Number.isFinite(v)) return "";
  return v.toFixed(decimals);
}

interface Props {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  decimals?: number;
  inline?: boolean; // if true, no label wrapping
  className?: string;
}

export function NumField({
  label,
  value,
  onChange,
  step = 1,
  min = -Infinity,
  max = Infinity,
  decimals = 0,
  inline,
  className,
}: Props) {
  const [local, setLocal] = useState(() => format(value, decimals));
  const focused = useRef(false);

  // Sync from outside when not focused (e.g. preset changes CdA)
  useEffect(() => {
    if (!focused.current) setLocal(format(value, decimals));
  }, [value, decimals]);

  const commit = () => {
    const parsed = parseFloat(local.replace(",", "."));
    if (!Number.isFinite(parsed)) {
      setLocal(format(value, decimals));
      return;
    }
    const clamped = Math.max(min, Math.min(max, parsed));
    onChange(clamped);
    setLocal(format(clamped, decimals));
  };

  const bump = (dir: 1 | -1) => {
    const base = Number.isFinite(parseFloat(local))
      ? parseFloat(local)
      : value;
    const next = Math.max(min, Math.min(max, base + dir * step));
    onChange(next);
    setLocal(format(next, decimals));
  };

  const input = (
    <div className="relative flex items-center">
      <input
        type="text"
        inputMode="decimal"
        value={local}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
          commit();
        }}
        onChange={(e) => setLocal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            bump(1);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            bump(-1);
          }
        }}
        className="w-full bg-transparent border-b border-ink py-[0.35rem] pr-6 font-mono text-base text-ink outline-none mono-nums focus:border-signal"
      />
      <div className="absolute right-0 flex flex-col gap-[1px]">
        <button
          type="button"
          aria-label="increment"
          onMouseDown={(e) => {
            e.preventDefault();
            bump(1);
          }}
          className="px-1 text-[0.55rem] leading-none text-graphite hover:text-signal"
        >
          ▲
        </button>
        <button
          type="button"
          aria-label="decrement"
          onMouseDown={(e) => {
            e.preventDefault();
            bump(-1);
          }}
          className="px-1 text-[0.55rem] leading-none text-graphite hover:text-signal"
        >
          ▼
        </button>
      </div>
    </div>
  );

  if (inline) return <div className={className}>{input}</div>;

  return (
    <div className={`field ${className ?? ""}`}>
      {label && <label>{label}</label>}
      {input}
    </div>
  );
}
