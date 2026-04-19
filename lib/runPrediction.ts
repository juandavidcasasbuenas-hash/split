import { predict } from "./physics";
import { monteCarlo, sensitivity } from "./montecarlo";
import { fetchCourseWeather } from "./weather";
import { DRAFTING } from "./drafting";
import { PACING } from "./pacing";
import { SURFACES } from "./surface";
import { useStore } from "./store";
import type { WeatherBundle } from "./types";

export interface RunOptions {
  /** Force a fresh weather fetch even if cached weather exists. */
  forceWeather?: boolean;
  /** Skip Monte Carlo + sensitivity (for very fast interactive reruns). */
  lightweight?: boolean;
}

/**
 * Orchestrate a full prediction cycle against the current store state.
 * Safe to call from anywhere — reads and writes state via the Zustand store.
 */
export async function runPrediction(opts: RunOptions = {}): Promise<void> {
  const state = useStore.getState();
  const {
    course,
    riderA,
    riderB,
    riderC,
    race,
    battleMode,
    weather: cachedWeather,
    setRunning,
    setWeather,
    setWeatherError,
    setPredictionA,
    setPredictionB,
    setPredictionC,
    setStatsA,
    setStatsB,
    setStatsC,
    setSensitivity,
  } = state;

  if (!course) return;

  try {
    const needWeather = opts.forceWeather || !cachedWeather;
    let weather: WeatherBundle;
    if (needWeather) {
      setRunning(true, "Fetching forecast");
      weather = await fetchCourseWeather(course, race.startIso, 5, 12);
      setWeather(weather);
    } else {
      weather = cachedWeather!;
    }

    const climbBonus =
      race.pacing === "custom"
        ? race.customClimbBonus
        : PACING[race.pacing].climbBonus;
    const descentRelief =
      race.pacing === "custom"
        ? race.customDescentRelief
        : PACING[race.pacing].descentRelief;
    const baseOptions = {
      crrMultiplier: SURFACES[race.surface].crrMul,
      draftingCdaMul: DRAFTING[race.drafting].cdaMul,
      climbBonus,
      descentRelief,
    };

    setRunning(true, "Solving physics");
    const predA = predict(course, riderA, weather, baseOptions);
    setPredictionA(predA);

    if (battleMode) {
      const predB = predict(course, riderB, weather, baseOptions);
      setPredictionB(predB);
      const predC = predict(course, riderC, weather, baseOptions);
      setPredictionC(predC);
    } else {
      setPredictionB(null);
      setPredictionC(null);
      setStatsB(null);
      setStatsC(null);
    }

    if (!opts.lightweight) {
      setRunning(true, "Monte Carlo");
      await new Promise((r) => setTimeout(r, 10));
      const statsA = monteCarlo(course, riderA, weather, {
        iterations: 120,
        baseOptions,
      });
      setStatsA(statsA);

      if (battleMode) {
        await new Promise((r) => setTimeout(r, 10));
        const statsB = monteCarlo(course, riderB, weather, {
          iterations: 120,
          baseOptions,
        });
        setStatsB(statsB);
        await new Promise((r) => setTimeout(r, 10));
        const statsC = monteCarlo(course, riderC, weather, {
          iterations: 120,
          baseOptions,
        });
        setStatsC(statsC);
      }

      setRunning(true, "Sensitivity");
      const sens = sensitivity(
        predA.totalTime,
        course,
        riderA,
        weather,
        baseOptions,
      );
      setSensitivity(sens);
    }
  } catch (err: any) {
    setWeatherError(err?.message ?? "Prediction failed.");
  } finally {
    setRunning(false);
  }
}
