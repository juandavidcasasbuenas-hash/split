export function fmtTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—:—:—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function fmtDelta(seconds: number): string {
  const sign = seconds > 0 ? "+" : seconds < 0 ? "−" : "±";
  const abs = Math.abs(seconds);
  const m = Math.floor(abs / 60);
  const s = Math.round(abs % 60);
  return `${sign}${m}:${s.toString().padStart(2, "0")}`;
}

export function fmtBand(lo: number, hi: number): string {
  const delta = (hi - lo) / 2;
  const m = Math.floor(delta / 60);
  const s = Math.round(delta % 60);
  return `± ${m}:${s.toString().padStart(2, "0")}`;
}

export function windLabel(degrees: number): string {
  const dirs = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  return dirs[Math.round(degrees / 22.5) % 16];
}

export function foliaNumber(): string {
  // deterministic-ish mark for the folio header
  const d = new Date();
  return `№ ${d.getUTCFullYear()}·${(d.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}·${d.getUTCDate().toString().padStart(2, "0")}`;
}
