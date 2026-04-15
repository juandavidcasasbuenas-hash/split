import { predict } from "./physics";
import type {
  Course,
  MonteCarloStats,
  Rider,
  Sensitivity,
  WeatherBundle,
} from "./types";

// Standard normal sample via Box–Muller
function randn(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface MCOptions {
  iterations?: number;
  cdaSigmaPct?: number; // relative sigma on CdA
  powerSigmaPct?: number; // relative sigma on FTP actually held
  windSpeedSigmaPct?: number; // relative sigma on wind speed
  windDirSigmaDeg?: number; // absolute sigma on direction
  // base options applied on every iteration (then perturbations stack)
  baseOptions?: {
    crrMultiplier?: number;
    draftingCdaMul?: number;
    climbBonus?: number;
    descentRelief?: number;
  };
}

export function monteCarlo(
  course: Course,
  rider: Rider,
  weather: WeatherBundle,
  opts: MCOptions = {},
): MonteCarloStats {
  const N = opts.iterations ?? 150;
  const cSig = opts.cdaSigmaPct ?? 0.05;
  const pSig = opts.powerSigmaPct ?? 0.04;
  const wSig = opts.windSpeedSigmaPct ?? 0.2;
  const dSig = opts.windDirSigmaDeg ?? 15;

  const base = opts.baseOptions ?? {};
  const samples: number[] = [];
  for (let i = 0; i < N; i++) {
    const out = predict(course, rider, weather, {
      ...base,
      cdaMultiplier: Math.max(0.7, 1 + randn() * cSig),
      powerMultiplier: Math.max(0.7, 1 + randn() * pSig),
      windMultiplier: Math.max(0, 1 + randn() * wSig),
      windDirOffsetDeg: randn() * dSig,
    });
    samples.push(out.totalTime);
  }
  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(N * 0.5)];
  const p10 = samples[Math.floor(N * 0.1)];
  const p90 = samples[Math.floor(N * 0.9)];
  const mean = samples.reduce((a, b) => a + b, 0) / N;
  const variance =
    samples.reduce((a, b) => a + (b - mean) * (b - mean), 0) / N;
  return { median, p10, p90, mean, std: Math.sqrt(variance), samples };
}

export function sensitivity(
  baseline: number,
  course: Course,
  rider: Rider,
  weather: WeatherBundle,
  baseOptions?: MCOptions["baseOptions"],
): Sensitivity[] {
  const cases: Array<{ label: string; desc: string; opt: Parameters<typeof predict>[3] }> = [
    {
      label: "CdA −0.010",
      desc: "Tighter aero position or equipment",
      opt: { cdaMultiplier: (rider.cda - 0.01) / rider.cda },
    },
    {
      label: "CdA +0.010",
      desc: "Looser posture under fatigue",
      opt: { cdaMultiplier: (rider.cda + 0.01) / rider.cda },
    },
    {
      label: "Power +5%",
      desc: "Held a harder intensity",
      opt: { powerMultiplier: 1.05 },
    },
    {
      label: "Power −5%",
      desc: "Faded under heat or fueling",
      opt: { powerMultiplier: 0.95 },
    },
    {
      label: "Wind +30%",
      desc: "Forecast under-called wind",
      opt: { windMultiplier: 1.3 },
    },
    {
      label: "Wind −30%",
      desc: "Calmer than forecast",
      opt: { windMultiplier: 0.7 },
    },
  ];
  return cases.map((c) => {
    const o = predict(course, rider, weather, { ...baseOptions, ...c.opt });
    return {
      label: c.label,
      deltaSeconds: o.totalTime - baseline,
      description: c.desc,
    };
  });
}
