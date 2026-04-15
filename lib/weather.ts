import type {
  Course,
  WeatherBundle,
  WeatherPoint,
  WeatherSource,
} from "./types";

/**
 * Open-Meteo integration with automatic routing:
 *  - forecast API for dates within ~16 days
 *  - archive API averaged over the last 3 years for dates further out
 *  - archive API for past dates
 *
 * All free, no API key required, CORS-enabled.
 */

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";

const HOURLY = [
  "temperature_2m",
  "relative_humidity_2m",
  "pressure_msl",
  "wind_speed_10m",
  "wind_direction_10m",
  "precipitation",
].join(",");

function ymd(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate(),
  )}`;
}

interface RawHourly {
  time: string[];
  temperature_2m: number[];
  relative_humidity_2m: number[];
  pressure_msl: number[];
  wind_speed_10m: number[];
  wind_direction_10m: number[];
  precipitation: number[];
}

async function fetchHourly(
  base: string,
  lat: number,
  lon: number,
  startDate: string,
  endDate: string,
): Promise<RawHourly> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: HOURLY,
    wind_speed_unit: "ms",
    timezone: "UTC",
    start_date: startDate,
    end_date: endDate,
  });
  const res = await fetch(`${base}?${params.toString()}`);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.hourly as RawHourly;
}

/** Slice a raw hourly block to the window [startMs, startMs + hoursAhead*3600*1000] */
function sliceWindow(
  raw: RawHourly,
  startMs: number,
  hoursAhead: number,
  lat: number,
  lon: number,
): WeatherPoint {
  const hours: number[] = [];
  const idxs: number[] = [];
  raw.time.forEach((t, i) => {
    const ms = new Date(t + "Z").getTime();
    const elapsed = (ms - startMs) / 3600000;
    if (elapsed >= -0.5 && elapsed <= hoursAhead + 1.5) {
      hours.push(elapsed);
      idxs.push(i);
    }
  });
  const pick = (arr: number[]) => idxs.map((i) => arr[i]);
  return {
    lat,
    lon,
    hours,
    temperature: pick(raw.temperature_2m),
    pressure: pick(raw.pressure_msl),
    humidity: pick(raw.relative_humidity_2m),
    windspeed: pick(raw.wind_speed_10m),
    winddir: pick(raw.wind_direction_10m),
    precip: pick(raw.precipitation),
  };
}

/** Circular mean of a list of degrees. */
function circMeanDeg(arr: number[]): number {
  let s = 0;
  let c = 0;
  for (const d of arr) {
    const r = (d * Math.PI) / 180;
    s += Math.sin(r);
    c += Math.cos(r);
  }
  const m = (Math.atan2(s, c) * 180) / Math.PI;
  return (m + 360) % 360;
}

async function fetchForecastPoint(
  lat: number,
  lon: number,
  startIso: string,
  hoursAhead: number,
): Promise<WeatherPoint> {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + hoursAhead * 3600 * 1000);
  const raw = await fetchHourly(
    FORECAST_URL,
    lat,
    lon,
    ymd(start),
    ymd(end),
  );
  return sliceWindow(raw, start.getTime(), hoursAhead, lat, lon);
}

/**
 * Pull the archive API for the same MM-DD-HH over the last N years and average
 * the results into a synthetic WeatherPoint. Uses year-0 as the "pretend"
 * startIso so elapsed-hour math in physics lines up.
 */
async function fetchClimatologyPoint(
  lat: number,
  lon: number,
  startIso: string,
  hoursAhead: number,
  yearsBack = 3,
): Promise<{ point: WeatherPoint; yearsUsed: number[] }> {
  const start = new Date(startIso);
  // Archive API has roughly a 2-day lag. Use years in [thisYear - N, thisYear - 1]
  const thisYear = new Date().getUTCFullYear();
  const years: number[] = [];
  for (let i = 1; i <= yearsBack; i++) years.push(thisYear - i);

  const samples = await Promise.all(
    years.map(async (y) => {
      const s = new Date(
        Date.UTC(
          y,
          start.getUTCMonth(),
          start.getUTCDate(),
          start.getUTCHours(),
          start.getUTCMinutes(),
        ),
      );
      const e = new Date(s.getTime() + hoursAhead * 3600 * 1000);
      const raw = await fetchHourly(ARCHIVE_URL, lat, lon, ymd(s), ymd(e));
      return sliceWindow(raw, s.getTime(), hoursAhead, lat, lon);
    }),
  );

  // Align by elapsed-hour and average. Use the first sample's hours as the
  // canonical grid (they should all be hourly from the same offset).
  const anchor = samples[0];
  const n = anchor.hours.length;
  const avg: WeatherPoint = {
    lat,
    lon,
    hours: anchor.hours.slice(),
    temperature: new Array(n).fill(0),
    pressure: new Array(n).fill(0),
    humidity: new Array(n).fill(0),
    windspeed: new Array(n).fill(0),
    winddir: new Array(n).fill(0),
    precip: new Array(n).fill(0),
  };
  for (let i = 0; i < n; i++) {
    let t = 0,
      p = 0,
      h = 0,
      ws = 0,
      pr = 0;
    const dirs: number[] = [];
    let k = 0;
    for (const s of samples) {
      if (i < s.temperature.length) {
        t += s.temperature[i];
        p += s.pressure[i];
        h += s.humidity[i];
        ws += s.windspeed[i];
        pr += s.precip[i];
        dirs.push(s.winddir[i]);
        k++;
      }
    }
    if (k === 0) k = 1;
    avg.temperature[i] = t / k;
    avg.pressure[i] = p / k;
    avg.humidity[i] = h / k;
    avg.windspeed[i] = ws / k;
    avg.precip[i] = pr / k;
    avg.winddir[i] = circMeanDeg(dirs);
  }
  return { point: avg, yearsUsed: years };
}

export interface CourseWeatherResult extends WeatherBundle {}

export async function fetchCourseWeather(
  course: Course,
  startIso: string,
  nStops = 5,
  hoursAhead = 12,
): Promise<CourseWeatherResult> {
  const stops: number[] = [];
  const locs: Array<{ lat: number; lon: number }> = [];
  for (let i = 0; i < nStops; i++) {
    const frac = i / (nStops - 1);
    stops.push(frac);
    const targetDist = frac * course.totalDistance;
    const seg =
      course.segments.find((s) => s.cumDist >= targetDist) ||
      course.segments[course.segments.length - 1];
    locs.push({ lat: seg.lat, lon: seg.lon });
  }

  const start = new Date(startIso);
  const now = new Date();
  const daysAhead = (start.getTime() - now.getTime()) / 86400000;

  let source: WeatherSource;
  let sourceDetail: string;
  let points: WeatherPoint[];

  if (daysAhead >= -2 && daysAhead <= 14) {
    // forecast window
    try {
      points = await Promise.all(
        locs.map((l) =>
          fetchForecastPoint(l.lat, l.lon, startIso, hoursAhead),
        ),
      );
      source = "forecast";
      sourceDetail = "Open-Meteo forecast, hourly";
    } catch (err) {
      // fall back to climatology
      const results = await Promise.all(
        locs.map((l) =>
          fetchClimatologyPoint(l.lat, l.lon, startIso, hoursAhead),
        ),
      );
      points = results.map((r) => r.point);
      const years = results[0].yearsUsed;
      source = "climatology";
      sourceDetail = `Forecast unavailable — ${years.length}-yr archive average (${years[years.length - 1]}–${years[0]})`;
    }
  } else if (daysAhead < -2) {
    // past date → archive direct
    points = await Promise.all(
      locs.map(async (l) => {
        const raw = await fetchHourly(
          ARCHIVE_URL,
          l.lat,
          l.lon,
          ymd(start),
          ymd(new Date(start.getTime() + hoursAhead * 3600 * 1000)),
        );
        return sliceWindow(raw, start.getTime(), hoursAhead, l.lat, l.lon);
      }),
    );
    source = "archive";
    sourceDetail = "Historical reanalysis (ERA5)";
  } else {
    // beyond 14 days → climatology
    const results = await Promise.all(
      locs.map((l) =>
        fetchClimatologyPoint(l.lat, l.lon, startIso, hoursAhead),
      ),
    );
    points = results.map((r) => r.point);
    const years = results[0].yearsUsed;
    source = "climatology";
    sourceDetail = `${years.length}-yr archive average for this date (${years[years.length - 1]}–${years[0]})`;
  }

  return { points, stops, source, sourceDetail };
}
