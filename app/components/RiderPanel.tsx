"use client";
import { useStore, cdaByPosition, SLOT_COLORS } from "@/lib/store";
import type { Position, RiderSlot } from "@/lib/store";
import { PanelHeader } from "./PanelHeader";
import { NumField } from "./NumField";

const SLOTS: RiderSlot[] = ["A", "B", "C"];

export function RiderPanel() {
  const battleMode = useStore((s) => s.battleMode);
  const activeSlot = useStore((s) => s.activeSlot);
  const setActiveSlot = useStore((s) => s.setActiveSlot);
  const riderNameA = useStore((s) => s.riderNameA);
  const riderNameB = useStore((s) => s.riderNameB);
  const riderNameC = useStore((s) => s.riderNameC);

  const names: Record<RiderSlot, string> = {
    A: riderNameA,
    B: riderNameB,
    C: riderNameC,
  };

  return (
    <div className="flex h-full flex-col">
      <PanelHeader step="02" title={battleMode ? "Riders — Battle" : "Rider"} />
      {battleMode && (
        <div className="grid grid-cols-3 border-b border-ink/30">
          {SLOTS.map((slot) => {
            const active = activeSlot === slot;
            const name = names[slot];
            const accent = SLOT_COLORS[slot];
            return (
              <button
                key={slot}
                type="button"
                onClick={() => setActiveSlot(slot)}
                className={`flex items-center justify-between px-3 py-2 text-left transition ${
                  active ? "bg-paper2" : "bg-paper hover:bg-paper2/60"
                }`}
                style={{
                  borderBottom: active ? `2px solid ${accent}` : "2px solid transparent",
                }}
              >
                <div>
                  <div
                    className="text-[0.6rem] uppercase tracking-[0.2em]"
                    style={{ color: accent }}
                  >
                    Rider {slot}
                  </div>
                  <div className="font-display text-sm leading-tight">
                    {name}
                  </div>
                </div>
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: accent, opacity: active ? 1 : 0.35 }}
                />
              </button>
            );
          })}
        </div>
      )}
      <div className="flex-1 space-y-4 p-5">
        <RiderEditor slot={activeSlot} />
      </div>
    </div>
  );
}

function RiderEditor({ slot }: { slot: RiderSlot }) {
  const rider = useStore((s) =>
    slot === "A" ? s.riderA : slot === "B" ? s.riderB : s.riderC,
  );
  const name = useStore((s) =>
    slot === "A" ? s.riderNameA : slot === "B" ? s.riderNameB : s.riderNameC,
  );
  const setRider = useStore((s) => s.setRider);
  const setPosition = useStore((s) => s.setPosition);
  const setRiderName = useStore((s) => s.setRiderName);
  const battleMode = useStore((s) => s.battleMode);

  const positions: Array<{ key: Position; label: string; sub: string }> = [
    { key: "tt", label: "Time Trial", sub: "aero bars" },
    { key: "aero", label: "Aero Road", sub: "drops + helmet" },
    { key: "drops", label: "Drops", sub: "road, in the drops" },
    { key: "hoods", label: "Hoods", sub: "road, relaxed" },
  ];

  return (
    <>
      {battleMode && (
        <div className="field">
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setRiderName(slot, e.target.value)}
            className="w-full bg-transparent border-b border-ink py-[0.35rem] outline-none focus:border-signal"
            style={{ fontFamily: "var(--font-instrument)", fontSize: "1rem" }}
          />
        </div>
      )}

      {/* Position selector */}
      <div>
        <div className="eyebrow mb-2">Position → CdA</div>
        <div className="grid grid-cols-2 gap-[1px] bg-ink/30">
          {positions.map((p) => {
            const active = rider.position === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setPosition(slot, p.key)}
                className={`px-3 py-2 text-left transition-colors ${
                  active ? "bg-ink text-paper" : "bg-paper hover:bg-paper2"
                }`}
              >
                <div className="text-[0.7rem] uppercase tracking-[0.14em]">
                  {p.label}
                </div>
                <div
                  className={`font-mono text-[0.7rem] mono-nums ${
                    active ? "text-paper/70" : "text-graphite"
                  }`}
                >
                  CdA {cdaByPosition[p.key].toFixed(3)} · {p.sub}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <NumField
          label="FTP (W)"
          value={rider.ftp}
          step={5}
          min={80}
          max={600}
          onChange={(v) => setRider(slot, { ftp: v })}
        />
        <NumField
          label="Target IF"
          value={rider.targetIF}
          step={0.01}
          min={0.4}
          max={1.1}
          decimals={2}
          onChange={(v) => setRider(slot, { targetIF: v })}
        />
        <NumField
          label="Rider (kg)"
          value={rider.riderMass}
          step={0.5}
          min={35}
          max={150}
          decimals={1}
          onChange={(v) => setRider(slot, { riderMass: v })}
        />
        <NumField
          label="Bike (kg)"
          value={rider.bikeMass}
          step={0.1}
          min={5}
          max={15}
          decimals={1}
          onChange={(v) => setRider(slot, { bikeMass: v })}
        />
        <NumField
          label="Kit (kg)"
          value={rider.kitMass}
          step={0.1}
          min={0}
          max={10}
          decimals={1}
          onChange={(v) => setRider(slot, { kitMass: v })}
        />
        <NumField
          label="Tire Crr"
          value={rider.crr}
          step={0.0005}
          min={0.002}
          max={0.02}
          decimals={4}
          onChange={(v) => setRider(slot, { crr: v })}
        />
        <NumField
          label="Max desc (km/h)"
          value={rider.maxDescentKmh}
          step={1}
          min={40}
          max={100}
          onChange={(v) => setRider(slot, { maxDescentKmh: v })}
        />
      </div>

      <div className="border-t border-ink/30 pt-3">
        <div className="flex items-baseline justify-between">
          <div className="eyebrow">CdA (override)</div>
          <div className="font-mono text-xs text-graphite mono-nums">m²</div>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <input
            type="range"
            min={0.18}
            max={0.45}
            step={0.002}
            value={rider.cda}
            onChange={(e) =>
              setRider(slot, { cda: parseFloat(e.target.value) })
            }
            className="flex-1 accent-[#C1432A]"
          />
          <div className="w-20">
            <NumField
              inline
              value={rider.cda}
              step={0.002}
              min={0.15}
              max={0.5}
              decimals={3}
              onChange={(v) => setRider(slot, { cda: v })}
            />
          </div>
        </div>
        <div className="mt-1 text-[0.7rem] text-graphite">
          Target power ≈{" "}
          <span className="font-mono mono-nums">
            {Math.round(rider.ftp * rider.targetIF)} W
          </span>
          {" · "}
          system mass{" "}
          <span className="font-mono mono-nums">
            {(rider.riderMass + rider.bikeMass + rider.kitMass).toFixed(1)} kg
          </span>
        </div>
      </div>
    </>
  );
}
