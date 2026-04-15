export interface TrackPoint {
  lat: number;
  lon: number;
  ele: number; // meters
}

export interface Segment {
  idx: number;
  lat: number;
  lon: number;
  ele: number;
  dist: number; // segment length, m
  cumDist: number; // m from start
  grade: number; // rise/run, signed
  bearing: number; // degrees, 0 = north, clockwise
}

export interface Course {
  name: string;
  segments: Segment[];
  totalDistance: number; // m
  totalAscent: number; // m
  totalDescent: number; // m
  minEle: number;
  maxEle: number;
  bbox: { minLat: number; maxLat: number; minLon: number; maxLon: number };
}

export interface Rider {
  ftp: number; // watts
  targetIF: number; // intensity factor 0..1.2
  riderMass: number; // kg
  bikeMass: number; // kg
  kitMass: number; // kg (bottles, food)
  cda: number; // m^2
  crr: number; // dimensionless
  drivetrainEff: number; // 0..1
  position: "tt" | "aero" | "hoods" | "drops";
}

import type { Surface } from "./surface";
import type { Drafting } from "./drafting";
import type { PacingStyle } from "./pacing";

export interface RaceSetup {
  startIso: string; // ISO 8601 with tz offset
  label: string;
  surface: Surface;
  drafting: Drafting;
  pacing: PacingStyle;
  customClimbBonus: number; // used when pacing === "custom"
  customDescentRelief: number;
}

export interface WeatherPoint {
  lat: number;
  lon: number;
  // arrays indexed by forecast hour (local to start)
  hours: number[]; // elapsed hours from startIso
  temperature: number[]; // celsius
  pressure: number[]; // hPa (sea level)
  humidity: number[]; // %
  windspeed: number[]; // m/s
  winddir: number[]; // deg, meteorological (from)
  precip: number[]; // mm
}

export type WeatherSource = "forecast" | "climatology" | "archive";

export interface WeatherBundle {
  points: WeatherPoint[]; // along the route, fractional stops
  stops: number[]; // fraction 0..1 along route matching points order
  source: WeatherSource;
  sourceDetail: string; // e.g. "3-yr historical average, 2023–2025"
}

export interface SegmentResult {
  segment: Segment;
  v: number; // m/s
  t: number; // seconds to traverse this segment
  cumT: number; // cumulative seconds from start
  power: number; // watts
  airDensity: number;
  windParallel: number; // headwind positive, m/s
  windSpeed: number; // m/s
  windDir: number; // deg
  temperature: number; // C
}

export interface PredictionOutput {
  perSegment: SegmentResult[];
  totalTime: number; // seconds
  avgPower: number;
  normalizedPower: number;
  variabilityIndex: number; // NP / AP
  avgSpeedKmh: number;
  distanceKm: number;
}

export interface MonteCarloStats {
  median: number;
  p10: number;
  p90: number;
  mean: number;
  std: number;
  samples: number[];
}

export interface Sensitivity {
  label: string;
  deltaSeconds: number; // vs baseline
  description: string;
}
