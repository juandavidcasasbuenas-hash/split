"use client";
import { create } from "zustand";
import type {
  Course,
  MonteCarloStats,
  PredictionOutput,
  RaceSetup,
  Rider,
  Sensitivity,
  WeatherBundle,
} from "./types";
import type { Surface } from "./surface";
import type { Drafting } from "./drafting";
import type { PacingStyle } from "./pacing";

export type Position = "tt" | "aero" | "hoods" | "drops";

const cdaByPosition: Record<Position, number> = {
  tt: 0.22,
  aero: 0.27,
  hoods: 0.32,
  drops: 0.3,
};

export type RiderSlot = "A" | "B" | "C";

export const SLOT_COLORS: Record<RiderSlot, string> = {
  A: "#C1432A",
  B: "#2B6E8A",
  C: "#D4A547",
};

const riderDefaults = (slot: RiderSlot): Rider => ({
  ftp: slot === "A" ? 280 : slot === "B" ? 295 : 270,
  targetIF: slot === "A" ? 0.78 : slot === "B" ? 0.76 : 0.8,
  riderMass: slot === "A" ? 72 : slot === "B" ? 68 : 75,
  bikeMass: 8.5,
  kitMass: 2.5,
  cda: cdaByPosition.tt,
  crr: 0.01,
  drivetrainEff: 0.976,
  position: "tt",
  maxDescentKmh: 70,
});

const riderNames: Record<RiderSlot, string> = {
  A: "Rider A",
  B: "Rider B",
  C: "Rider C",
};

interface State {
  course: Course | null;
  courseError: string | null;

  battleMode: boolean;
  riderA: Rider;
  riderB: Rider;
  riderC: Rider;
  riderNameA: string;
  riderNameB: string;
  riderNameC: string;
  activeSlot: RiderSlot;

  race: RaceSetup;
  weather: WeatherBundle | null;
  weatherError: string | null;

  predictionA: PredictionOutput | null;
  predictionB: PredictionOutput | null;
  predictionC: PredictionOutput | null;
  statsA: MonteCarloStats | null;
  statsB: MonteCarloStats | null;
  statsC: MonteCarloStats | null;
  sensitivity: Sensitivity[] | null;

  running: boolean;
  progressMessage: string;

  setCourse: (c: Course | null) => void;
  setCourseError: (e: string | null) => void;

  setBattleMode: (b: boolean) => void;
  setActiveSlot: (s: RiderSlot) => void;
  setRider: (slot: RiderSlot, patch: Partial<Rider>) => void;
  setPosition: (slot: RiderSlot, p: Position) => void;
  setRiderName: (slot: RiderSlot, name: string) => void;

  setRace: (patch: Partial<RaceSetup>) => void;
  setSurface: (s: Surface) => void;
  setDrafting: (d: Drafting) => void;
  setPacing: (p: PacingStyle) => void;
  setCustomPacing: (patch: {
    climbBonus?: number;
    descentRelief?: number;
  }) => void;

  setWeather: (w: WeatherBundle | null) => void;
  setWeatherError: (e: string | null) => void;
  setPredictionA: (p: PredictionOutput | null) => void;
  setPredictionB: (p: PredictionOutput | null) => void;
  setPredictionC: (p: PredictionOutput | null) => void;
  setStatsA: (s: MonteCarloStats | null) => void;
  setStatsB: (s: MonteCarloStats | null) => void;
  setStatsC: (s: MonteCarloStats | null) => void;
  setSensitivity: (s: Sensitivity[] | null) => void;

  setRunning: (b: boolean, msg?: string) => void;
}

const defaultStart = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
};

export const useStore = create<State>((set) => ({
  course: null,
  courseError: null,

  battleMode: false,
  riderA: riderDefaults("A"),
  riderB: riderDefaults("B"),
  riderC: riderDefaults("C"),
  riderNameA: riderNames.A,
  riderNameB: riderNames.B,
  riderNameC: riderNames.C,
  activeSlot: "A",

  race: {
    startIso: defaultStart(),
    label: "",
    surface: "tarmac",
    drafting: "solo",
    pacing: "variable",
    customClimbBonus: 0.22,
    customDescentRelief: 0.7,
  },
  weather: null,
  weatherError: null,
  predictionA: null,
  predictionB: null,
  predictionC: null,
  statsA: null,
  statsB: null,
  statsC: null,
  sensitivity: null,

  running: false,
  progressMessage: "",

  setCourse: (c) => set({ course: c, courseError: null }),
  setCourseError: (e) => set({ courseError: e }),

  setBattleMode: (b) =>
    set((s) => ({
      battleMode: b,
      activeSlot: b ? s.activeSlot : "A",
      predictionB: b ? s.predictionB : null,
      predictionC: b ? s.predictionC : null,
      statsB: b ? s.statsB : null,
      statsC: b ? s.statsC : null,
    })),
  setActiveSlot: (slot) => set({ activeSlot: slot }),
  setRider: (slot, patch) =>
    set((s) => {
      const current = slot === "A" ? s.riderA : slot === "B" ? s.riderB : s.riderC;
      const next = { ...current, ...patch };
      return slot === "A"
        ? { riderA: next }
        : slot === "B"
        ? { riderB: next }
        : { riderC: next };
    }),
  setPosition: (slot, p) =>
    set((s) => {
      const current = slot === "A" ? s.riderA : slot === "B" ? s.riderB : s.riderC;
      const next = { ...current, position: p, cda: cdaByPosition[p] };
      return slot === "A"
        ? { riderA: next }
        : slot === "B"
        ? { riderB: next }
        : { riderC: next };
    }),
  setRiderName: (slot, name) =>
    set(() =>
      slot === "A"
        ? { riderNameA: name }
        : slot === "B"
        ? { riderNameB: name }
        : { riderNameC: name },
    ),

  setRace: (patch) => set((s) => ({ race: { ...s.race, ...patch } })),
  setSurface: (surface) => set((s) => ({ race: { ...s.race, surface } })),
  setDrafting: (drafting) => set((s) => ({ race: { ...s.race, drafting } })),
  setPacing: (pacing) => set((s) => ({ race: { ...s.race, pacing } })),
  setCustomPacing: (patch) =>
    set((s) => ({
      race: {
        ...s.race,
        pacing: "custom",
        customClimbBonus:
          patch.climbBonus ?? s.race.customClimbBonus,
        customDescentRelief:
          patch.descentRelief ?? s.race.customDescentRelief,
      },
    })),

  setWeather: (w) => set({ weather: w, weatherError: null }),
  setWeatherError: (e) => set({ weatherError: e }),
  setPredictionA: (p) => set({ predictionA: p }),
  setPredictionB: (p) => set({ predictionB: p }),
  setPredictionC: (p) => set({ predictionC: p }),
  setStatsA: (s) => set({ statsA: s }),
  setStatsB: (s) => set({ statsB: s }),
  setStatsC: (s) => set({ statsC: s }),
  setSensitivity: (s) => set({ sensitivity: s }),

  setRunning: (b, msg) => set({ running: b, progressMessage: msg ?? "" }),
}));

export { cdaByPosition };
