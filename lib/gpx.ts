import type { Course, Segment, TrackPoint } from "./types";

const R_EARTH = 6371000;

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}
function toDeg(r: number): number {
  return (r * 180) / Math.PI;
}

export function haversine(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const la1 = toRad(aLat);
  const la2 = toRad(bLat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function bearing(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const la1 = toRad(aLat);
  const la2 = toRad(bLat);
  const dLon = toRad(bLon - aLon);
  const y = Math.sin(dLon) * Math.cos(la2);
  const x =
    Math.cos(la1) * Math.sin(la2) -
    Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
  let b = toDeg(Math.atan2(y, x));
  if (b < 0) b += 360;
  return b;
}

export function parseGpx(xml: string): { name: string; points: TrackPoint[] } {
  if (typeof DOMParser === "undefined") {
    throw new Error("GPX parser requires a DOM (client-side).");
  }
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const err = doc.getElementsByTagName("parsererror")[0];
  if (err) throw new Error("Invalid GPX file.");
  const nameEl = doc.querySelector("trk > name, metadata > name, name");
  const name = nameEl?.textContent?.trim() || "Untitled course";
  const pts: TrackPoint[] = [];
  const ptEls = doc.querySelectorAll("trkpt, rtept");
  ptEls.forEach((el) => {
    const lat = parseFloat(el.getAttribute("lat") || "NaN");
    const lon = parseFloat(el.getAttribute("lon") || "NaN");
    const eleEl = el.querySelector("ele");
    const ele = eleEl ? parseFloat(eleEl.textContent || "0") : 0;
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      pts.push({ lat, lon, ele });
    }
  });
  if (pts.length < 2) throw new Error("Not enough track points in GPX.");
  return { name, points: pts };
}

function smoothElevation(pts: TrackPoint[], windowM: number): TrackPoint[] {
  // running-average by cumulative distance window
  const n = pts.length;
  const cum: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    cum[i] =
      cum[i - 1] +
      haversine(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon);
  }
  const out: TrackPoint[] = pts.map((p) => ({ ...p }));
  for (let i = 0; i < n; i++) {
    const lo = cum[i] - windowM / 2;
    const hi = cum[i] + windowM / 2;
    let sum = 0;
    let count = 0;
    // linear search from i outward — small windows keep this cheap
    for (let j = i; j < n && cum[j] <= hi; j++) {
      sum += pts[j].ele;
      count++;
    }
    for (let j = i - 1; j >= 0 && cum[j] >= lo; j--) {
      sum += pts[j].ele;
      count++;
    }
    out[i].ele = sum / Math.max(1, count);
  }
  return out;
}

/** Resample to near-uniform segment spacing (meters). */
export function buildCourse(
  raw: { name: string; points: TrackPoint[] },
  segLenM = 100,
): Course {
  const pts = smoothElevation(raw.points, 60);
  // total linear distance
  const cum: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(
      cum[i - 1] +
        haversine(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon),
    );
  }
  const total = cum[cum.length - 1];
  const nSeg = Math.max(20, Math.floor(total / segLenM));
  const step = total / nSeg;

  const segments: Segment[] = [];
  let prevLat = pts[0].lat;
  let prevLon = pts[0].lon;
  let prevEle = pts[0].ele;
  let cursor = 0;

  const sampleAt = (dist: number) => {
    // find bracketing original points
    while (cursor < cum.length - 2 && cum[cursor + 1] < dist) cursor++;
    const d0 = cum[cursor];
    const d1 = cum[cursor + 1];
    const t = (dist - d0) / Math.max(1e-6, d1 - d0);
    const p0 = pts[cursor];
    const p1 = pts[cursor + 1];
    return {
      lat: p0.lat + t * (p1.lat - p0.lat),
      lon: p0.lon + t * (p1.lon - p0.lon),
      ele: p0.ele + t * (p1.ele - p0.ele),
    };
  };

  let ascent = 0;
  let descent = 0;
  let minE = pts[0].ele;
  let maxE = pts[0].ele;
  let minLat = pts[0].lat,
    maxLat = pts[0].lat,
    minLon = pts[0].lon,
    maxLon = pts[0].lon;

  for (let i = 1; i <= nSeg; i++) {
    const dist = i * step;
    const s = sampleAt(dist);
    const segDist = haversine(prevLat, prevLon, s.lat, s.lon);
    const dEle = s.ele - prevEle;
    const grade = segDist > 0 ? dEle / segDist : 0;
    if (dEle > 0) ascent += dEle;
    else descent += -dEle;
    minE = Math.min(minE, s.ele);
    maxE = Math.max(maxE, s.ele);
    minLat = Math.min(minLat, s.lat);
    maxLat = Math.max(maxLat, s.lat);
    minLon = Math.min(minLon, s.lon);
    maxLon = Math.max(maxLon, s.lon);
    const brg = bearing(prevLat, prevLon, s.lat, s.lon);
    segments.push({
      idx: i - 1,
      lat: s.lat,
      lon: s.lon,
      ele: s.ele,
      dist: segDist,
      cumDist: dist,
      grade: Math.max(-0.25, Math.min(0.25, grade)),
      bearing: brg,
    });
    prevLat = s.lat;
    prevLon = s.lon;
    prevEle = s.ele;
  }

  return {
    name: raw.name,
    segments,
    totalDistance: total,
    totalAscent: ascent,
    totalDescent: descent,
    minEle: minE,
    maxEle: maxE,
    bbox: { minLat, maxLat, minLon, maxLon },
  };
}
