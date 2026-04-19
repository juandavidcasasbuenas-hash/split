import type {
  Course,
  PredictionOutput,
  Rider,
  Segment,
  SegmentResult,
  WeatherBundle,
} from "./types";
import { effectiveDraftMul } from "./drafting";

const G = 9.80665;
const R_d = 287.058; // dry-air specific gas constant
const R_v = 461.495;

/**
 * Air density from temperature (C), station pressure (hPa), humidity (%),
 * corrected for altitude using barometric approximation from sea-level pressure.
 */
export function airDensity(
  tempC: number,
  pressureHpaSL: number,
  humidityPct: number,
  eleM: number,
): number {
  const T = tempC + 273.15;
  // altitude-adjusted pressure (barometric formula, isothermal-ish)
  const P = pressureHpaSL * 100 * Math.exp((-0.00012 * eleM));
  const es = 6.1078 * Math.pow(10, (7.5 * tempC) / (tempC + 237.3)) * 100; // Pa
  const e = (humidityPct / 100) * es;
  const Pd = P - e;
  return Pd / (R_d * T) + e / (R_v * T);
}

/**
 * Crank-side power required to hold a given v on a given grade.
 * Negative result means gravity > resistive forces — rider would accelerate
 * past v without pedaling and must brake.
 */
export function requiredPowerForVelocity(
  v: number,
  grade: number,
  rho: number,
  cda: number,
  crr: number,
  totalMass: number,
  windParallel: number,
  drivetrainEff: number,
): number {
  const theta = Math.atan(grade);
  const sinT = Math.sin(theta);
  const cosT = Math.cos(theta);
  const vApp = v + windParallel;
  const aero = 0.5 * rho * cda * vApp * Math.abs(vApp);
  const roll = crr * totalMass * G * cosT;
  const grav = totalMass * G * sinT;
  const Pwheel = (aero + roll + grav) * v;
  return Pwheel / drivetrainEff;
}

/**
 * Solve for velocity v given power P balance over a segment.
 * F_drive = 0.5 * rho * CdA * (v + w_par)^2 * sign + Crr*m*g*cos(theta) + m*g*sin(theta)
 * P_wheel = F_drive * v, P_in = P_wheel / eta
 * We fix P_in at target. Solve numerically.
 *
 * windParallel: component of wind along direction of travel, m/s.
 *   positive = headwind (adds to apparent wind);
 *   negative = tailwind.
 */
export function solveVelocity(
  powerW: number,
  grade: number,
  rho: number,
  cda: number,
  crr: number,
  totalMass: number,
  windParallel: number,
  drivetrainEff: number,
): number {
  const theta = Math.atan(grade);
  const sinT = Math.sin(theta);
  const cosT = Math.cos(theta);
  const Pwheel = powerW * drivetrainEff;

  // f(v) = [0.5*rho*CdA*(v+w)^2 * sign(v+w) + Crr*m*g*cosT + m*g*sinT] * v - Pwheel
  const fn = (v: number): number => {
    const vApp = v + windParallel;
    const aero = 0.5 * rho * cda * vApp * Math.abs(vApp);
    const roll = crr * totalMass * G * cosT;
    const grav = totalMass * G * sinT;
    return (aero + roll + grav) * v - Pwheel;
  };

  // bisect between reasonable bounds; allow very low v on steep climbs
  let lo = 0.5;
  let hi = 30; // 108 km/h; cap
  // expand hi if needed
  while (fn(hi) < 0 && hi < 80) hi *= 1.5;
  let flo = fn(lo);
  let fhi = fn(hi);
  if (flo > 0 && fhi > 0) {
    // even at lo, forces > Pwheel — walking-speed; allow lower
    lo = 0.1;
    flo = fn(lo);
    if (flo > 0) {
      // rider physically can't sustain — cap at very low speed
      return 0.5;
    }
  }
  if (flo < 0 && fhi < 0) {
    // should not happen given expand; cap at hi
    return hi;
  }
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    const fm = fn(mid);
    if (Math.abs(fm) < 1e-3) return mid;
    if (flo * fm < 0) {
      hi = mid;
      fhi = fm;
    } else {
      lo = mid;
      flo = fm;
    }
  }
  return 0.5 * (lo + hi);
}

/**
 * Weather lookup: linearly interpolate between route waypoints (by fraction along
 * route), then linearly interpolate forecast by elapsed-hour.
 */
interface WeatherAt {
  temperature: number;
  pressure: number;
  humidity: number;
  windspeed: number;
  winddir: number;
}
function interpWeather(
  weather: WeatherBundle,
  frac: number,
  elapsedH: number,
): WeatherAt {
  // find bracketing stops
  const stops = weather.stops;
  let iA = 0;
  let iB = stops.length - 1;
  for (let i = 0; i < stops.length - 1; i++) {
    if (frac >= stops[i] && frac <= stops[i + 1]) {
      iA = i;
      iB = i + 1;
      break;
    }
  }
  const span = stops[iB] - stops[iA] || 1;
  const wt = (frac - stops[iA]) / span;

  const sampleAt = (pIdx: number): WeatherAt => {
    const p = weather.points[pIdx];
    // find bracketing hour
    let hA = 0;
    let hB = p.hours.length - 1;
    for (let i = 0; i < p.hours.length - 1; i++) {
      if (elapsedH >= p.hours[i] && elapsedH <= p.hours[i + 1]) {
        hA = i;
        hB = i + 1;
        break;
      }
    }
    if (elapsedH >= p.hours[p.hours.length - 1]) {
      hA = hB = p.hours.length - 1;
    } else if (elapsedH <= p.hours[0]) {
      hA = hB = 0;
    }
    const hSpan = p.hours[hB] - p.hours[hA] || 1;
    const ht = hA === hB ? 0 : (elapsedH - p.hours[hA]) / hSpan;
    const lerp = (a: number, b: number) => a + ht * (b - a);
    // circular interp for wind direction
    const lerpDir = (a: number, b: number) => {
      let d = b - a;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      let r = a + ht * d;
      if (r < 0) r += 360;
      if (r >= 360) r -= 360;
      return r;
    };
    return {
      temperature: lerp(p.temperature[hA], p.temperature[hB]),
      pressure: lerp(p.pressure[hA], p.pressure[hB]),
      humidity: lerp(p.humidity[hA], p.humidity[hB]),
      windspeed: lerp(p.windspeed[hA], p.windspeed[hB]),
      winddir: lerpDir(p.winddir[hA], p.winddir[hB]),
    };
  };

  const A = sampleAt(iA);
  const B = sampleAt(iB);
  const lerp = (a: number, b: number) => a + wt * (b - a);
  const lerpDir = (a: number, b: number) => {
    let d = b - a;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    let r = a + wt * d;
    if (r < 0) r += 360;
    if (r >= 360) r -= 360;
    return r;
  };
  return {
    temperature: lerp(A.temperature, B.temperature),
    pressure: lerp(A.pressure, B.pressure),
    humidity: lerp(A.humidity, B.humidity),
    windspeed: lerp(A.windspeed, B.windspeed),
    winddir: lerpDir(A.winddir, B.winddir),
  };
}

/**
 * Wind parallel component along bearing. Meteorological convention:
 * winddir is the direction wind is coming FROM (0 = from north).
 * bearing is the direction the rider is heading (0 = north).
 * Headwind component (positive when wind comes from ahead) =
 *   windspeed * cos(winddir - bearing).
 */
export function windParallelComponent(
  windspeed: number,
  winddirDeg: number,
  bearingDeg: number,
): number {
  const diff = ((winddirDeg - bearingDeg) * Math.PI) / 180;
  return windspeed * Math.cos(diff);
}

export interface PredictOptions {
  cdaMultiplier?: number; // for monte-carlo perturbation
  powerMultiplier?: number;
  windMultiplier?: number;
  windDirOffsetDeg?: number;
  crrMultiplier?: number; // surface effect
  draftingCdaMul?: number; // 1.0 = solo; <1 = drafting benefit on flat terrain
  climbBonus?: number; // fraction above target on steep climbs (e.g. 0.18)
  descentRelief?: number; // fraction below target on steep descents (e.g. 0.4)
}

export function predict(
  course: Course,
  rider: Rider,
  weather: WeatherBundle,
  opts: PredictOptions = {},
): PredictionOutput {
  const totalMass = rider.riderMass + rider.bikeMass + rider.kitMass;
  const basePower = rider.ftp * rider.targetIF * (opts.powerMultiplier ?? 1);
  const cda = rider.cda * (opts.cdaMultiplier ?? 1);
  const crr = rider.crr * (opts.crrMultiplier ?? 1);
  const windMul = opts.windMultiplier ?? 1;
  const windOff = opts.windDirOffsetDeg ?? 0;
  const draftingCdaMul = opts.draftingCdaMul ?? 1;
  const climbBonus = opts.climbBonus ?? 0.2;
  const descentRelief = opts.descentRelief ?? 0.4;
  // endpoint grades for the pacing ramps
  const CLIMB_STEEP_PCT = 12;
  // grade (negative %) at which the descentRelief reduction is fully applied.
  // Past this grade, no further power easing — speed cap takes over.
  const COAST_GRADE_PCT = -6;
  const maxDescentMs = (rider.maxDescentKmh ?? 70) / 3.6;

  const results: SegmentResult[] = [];
  let cumT = 0;

  for (const seg of course.segments) {
    const frac = seg.cumDist / course.totalDistance;
    const elapsedH = cumT / 3600;
    const w = interpWeather(weather, frac, elapsedH);
    const rho = airDensity(w.temperature, w.pressure, w.humidity, seg.ele);
    const winddir = w.winddir + windOff;
    const windspeed = w.windspeed * windMul;
    const wPar = windParallelComponent(windspeed, winddir, seg.bearing);

    const gradePct = seg.grade * 100;

    // Pacing power modulation: push climbs, ease descents
    let powerMod = 1;
    if (gradePct > 0.5) {
      powerMod =
        1 + Math.min(climbBonus, (gradePct / CLIMB_STEEP_PCT) * climbBonus);
    } else if (gradePct < -1) {
      const tFrac = Math.min(
        1,
        (Math.abs(gradePct) - 1) / (Math.abs(COAST_GRADE_PCT) - 1),
      );
      powerMod = 1 - tFrac * descentRelief;
      if (powerMod < 0.05) powerMod = 0;
    }
    let P = basePower * powerMod;

    // Terrain-gated drafting: full benefit on flats/rollers, fades to solo on climbs
    const draftMul = effectiveDraftMul(draftingCdaMul, gradePct);
    const effCda = cda * draftMul;

    let v = solveVelocity(
      P,
      seg.grade,
      rho,
      effCda,
      crr,
      totalMass,
      wPar,
      rider.drivetrainEff,
    );

    // Descent speed cap: rider brakes / light-pedals to hold maxDescentKmh.
    if (v > maxDescentMs) {
      const requiredP = requiredPowerForVelocity(
        maxDescentMs,
        seg.grade,
        rho,
        effCda,
        crr,
        totalMass,
        wPar,
        rider.drivetrainEff,
      );
      if (requiredP <= 0) {
        // gravity overpowers resistive forces — coast and brake to cap
        P = 0;
      } else {
        // light pedal to hold cap; never above what was originally planned
        P = Math.min(P, requiredP);
      }
      v = maxDescentMs;
    }

    const t = seg.dist / v;
    cumT += t;
    results.push({
      segment: seg,
      v,
      t,
      cumT,
      power: P,
      airDensity: rho,
      windParallel: wPar,
      windSpeed: windspeed,
      windDir: winddir,
      temperature: w.temperature,
    });
  }

  // normalized power: 4th-power avg over ~30s windows
  const npWindowSec = 30;
  let npSum = 0;
  let npCount = 0;
  let bucket = 0;
  let bucketT = 0;
  for (const r of results) {
    bucket += Math.pow(r.power, 4) * r.t;
    bucketT += r.t;
    if (bucketT >= npWindowSec) {
      const avg4 = bucket / bucketT;
      npSum += Math.pow(avg4, 1) * bucketT;
      npCount += bucketT;
      bucket = 0;
      bucketT = 0;
    }
  }
  if (bucketT > 0) {
    npSum += (bucket / bucketT) * bucketT;
    npCount += bucketT;
  }
  const np = Math.pow(npSum / Math.max(1, npCount), 0.25);

  const totalTime = cumT;
  const distanceKm = course.totalDistance / 1000;
  const avgSpeedKmh = (course.totalDistance / totalTime) * 3.6;
  const avgPower =
    results.reduce((a, r) => a + r.power * r.t, 0) / Math.max(1, totalTime);
  const variabilityIndex = avgPower > 0 ? np / avgPower : 1;

  return {
    perSegment: results,
    totalTime,
    avgPower,
    normalizedPower: np,
    variabilityIndex,
    avgSpeedKmh,
    distanceKm,
  };
}
