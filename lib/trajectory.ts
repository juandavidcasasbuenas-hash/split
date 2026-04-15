import type { PredictionOutput } from "./types";

export interface TrajPoint {
  t: number; // elapsed seconds
  lat: number;
  lon: number;
  km: number;
  v: number; // m/s
  power: number;
  ele: number;
}

/** Build a dense, time-sampled trajectory from a PredictionOutput. */
export function buildTrajectory(
  pred: PredictionOutput,
  dtSec = 0.5,
): TrajPoint[] {
  const segs = pred.perSegment;
  if (segs.length === 0) return [];
  const T = pred.totalTime;
  const out: TrajPoint[] = [];
  // Segment i spans (cumT_{i-1}, cumT_i) with endpoint pos at cumT_i.
  // Start position (t=0) taken as segs[0]'s own lat/lon, since segment 0 is
  // short (~100m) and the course loop's real pts[0] wasn't retained. Good enough.
  const startLat = segs[0].segment.lat;
  const startLon = segs[0].segment.lon;
  const startEle = segs[0].segment.ele;

  let i = 0;
  for (let t = 0; t <= T + 1e-6; t += dtSec) {
    while (i < segs.length - 1 && segs[i].cumT < t) i++;
    const seg = segs[i];
    const prevT = i > 0 ? segs[i - 1].cumT : 0;
    const prevLat = i > 0 ? segs[i - 1].segment.lat : startLat;
    const prevLon = i > 0 ? segs[i - 1].segment.lon : startLon;
    const prevEle = i > 0 ? segs[i - 1].segment.ele : startEle;
    const prevKm = i > 0 ? segs[i - 1].segment.cumDist / 1000 : 0;
    const span = Math.max(1e-6, seg.cumT - prevT);
    const w = Math.max(0, Math.min(1, (t - prevT) / span));
    out.push({
      t,
      lat: prevLat + w * (seg.segment.lat - prevLat),
      lon: prevLon + w * (seg.segment.lon - prevLon),
      km: prevKm + w * (seg.segment.cumDist / 1000 - prevKm),
      v: seg.v,
      power: seg.power,
      ele: prevEle + w * (seg.segment.ele - prevEle),
    });
  }
  // Ensure final point at exactly T
  if (out[out.length - 1].t < T) {
    const last = segs[segs.length - 1];
    const prevKm = last.segment.cumDist / 1000;
    out.push({
      t: T,
      lat: last.segment.lat,
      lon: last.segment.lon,
      km: prevKm,
      v: last.v,
      power: last.power,
      ele: last.segment.ele,
    });
  }
  return out;
}

/** Sample a trajectory at time t (linear interp between samples). */
export function sampleAt(traj: TrajPoint[], t: number): TrajPoint {
  if (traj.length === 0)
    return { t: 0, lat: 0, lon: 0, km: 0, v: 0, power: 0, ele: 0 };
  if (t <= traj[0].t) return traj[0];
  if (t >= traj[traj.length - 1].t) return traj[traj.length - 1];
  // binary search
  let lo = 0;
  let hi = traj.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (traj[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = traj[lo];
  const b = traj[hi];
  const w = (t - a.t) / Math.max(1e-6, b.t - a.t);
  return {
    t,
    lat: a.lat + w * (b.lat - a.lat),
    lon: a.lon + w * (b.lon - a.lon),
    km: a.km + w * (b.km - a.km),
    v: a.v + w * (b.v - a.v),
    power: a.power + w * (b.power - a.power),
    ele: a.ele + w * (b.ele - a.ele),
  };
}
