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

export type RiderSlot = "A" | "B";

const riderDefaults = (slot: RiderSlot): Rider => ({
  ftp: slot === "A" ? 280 : 295,
  targetIF: slot === "A" ? 0.78 : 0.76,
  riderMass: slot === "A" ? 72 : 68,
  bikeMass: 8.5,
  kitMass: 2.5,
  cda: cdaByPosition.tt,
  crr: 0.0045,
  drivetrainEff: 0.976,
  position: "tt",
});

const riderNames = { A: "Rider A", B: "Rider B" };

interface State {
  course: Course | null;
  courseError: string | null;

  duelMode: boolean;
  riderA: Rider;
  riderB: Rider;
  riderNameA: string;
  riderNameB: string;
  activeSlot: RiderSlot;

  race: RaceSetup;
  weather: WeatherBundle | null;
  weatherError: string | null;

  predictionA: PredictionOutput | null;
  predictionB: PredictionOutput | null;
  statsA: MonteCarloStats | null;
  statsB: MonteCarloStats | null;
  sensitivity: Sensitivity[] | null;

  running: boolean;
  progressMessage: string;

  setCourse: (c: Course | null) => void;
  setCourseError: (e: string | null) => void;

  setDuelMode: (b: boolean) => void;
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
  setStatsA: (s: MonteCarloStats | null) => void;
  setStatsB: (s: MonteCarloStats | null) => void;
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

  duelMode: false,
  riderA: riderDefaults("A"),
  riderB: riderDefaults("B"),
  riderNameA: riderNames.A,
  riderNameB: riderNames.B,
  activeSlot: "A",

  race: {
    startIso: defaultStart(),
    label: "",
    surface: "tarmac",
    drafting: "solo",
    pacing: "variable",
    customClimbBonus: 0.18,
    customDescentRelief: 0.4,
  },
  weather: null,
  weatherError: null,
  predictionA: null,
  predictionB: null,
  statsA: null,
  statsB: null,
  sensitivity: null,

  running: false,
  progressMessage: "",

  setCourse: (c) => set({ course: c, courseError: null }),
  setCourseError: (e) => set({ courseError: e }),

  setDuelMode: (b) =>
    set((s) => ({
      duelMode: b,
      activeSlot: b ? s.activeSlot : "A",
      predictionB: b ? s.predictionB : null,
      statsB: b ? s.statsB : null,
    })),
  setActiveSlot: (slot) => set({ activeSlot: slot }),
  setRider: (slot, patch) =>
    set((s) => ({
      ...(slot === "A"
        ? { riderA: { ...s.riderA, ...patch } }
        : { riderB: { ...s.riderB, ...patch } }),
    })),
  setPosition: (slot, p) =>
    set((s) => {
      const r = slot === "A" ? s.riderA : s.riderB;
      const next = { ...r, position: p, cda: cdaByPosition[p] };
      return slot === "A" ? { riderA: next } : { riderB: next };
    }),
  setRiderName: (slot, name) =>
    set(() => (slot === "A" ? { riderNameA: name } : { riderNameB: name })),

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
  setStatsA: (s) => set({ statsA: s }),
  setStatsB: (s) => set({ statsB: s }),
  setSensitivity: (s) => set({ sensitivity: s }),

  setRunning: (b, msg) => set({ running: b, progressMessage: msg ?? "" }),
}));

export { cdaByPosition };
