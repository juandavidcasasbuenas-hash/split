"use client";
import { useStore } from "@/lib/store";
import { PanelHeader } from "./PanelHeader";

export function RaceDayPanel() {
  const race = useStore((s) => s.race);
  const setRace = useStore((s) => s.setRace);
  const weather = useStore((s) => s.weather);
  const weatherError = useStore((s) => s.weatherError);

  const localValue = (() => {
    const d = new Date(race.startIso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours(),
    )}:${pad(d.getMinutes())}`;
  })();

  return (
    <div className="flex h-full flex-col">
      <PanelHeader step="02" title="Start" />
      <div className="flex-1 space-y-5 p-5">
        <div className="field">
          <label>Local date & time</label>
          <input
            type="datetime-local"
            value={localValue}
            onChange={(e) => {
              const d = new Date(e.target.value);
              setRace({ startIso: d.toISOString() });
            }}
          />
        </div>

        <div className="border-t border-ink/20 pt-4">
          <div className="mb-2 flex items-baseline justify-between">
            <div className="eyebrow">Forecast</div>
            {weather && (
              <span
                className="stamp"
                style={{
                  fontSize: "0.55rem",
                  padding: "0.15rem 0.4rem",
                  borderColor:
                    weather.source === "forecast"
                      ? "var(--ink)"
                      : "var(--ochre)",
                  color:
                    weather.source === "forecast"
                      ? "var(--ink)"
                      : "var(--ochre)",
                }}
                title={weather.sourceDetail}
              >
                {weather.source}
              </span>
            )}
          </div>
          {weatherError && (
            <div className="mb-2 border border-signal bg-signal/10 p-2 text-xs text-signal">
              {weatherError}
            </div>
          )}
          {weather ? (
            <>
              <WeatherMicro />
              <div className="mt-2 text-[0.65rem] text-graphite">
                {weather.sourceDetail}
              </div>
            </>
          ) : (
            <div className="text-xs text-graphite">
              Weather fetches automatically once you've set a course. For races
              more than ~2 weeks out, we fall back to a 3-year archive average
              for the same calendar date.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WeatherMicro() {
  const weather = useStore((s) => s.weather);
  if (!weather) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      {weather.points
        .filter((_, i, arr) =>
          i === 0 || i === arr.length - 1 || i === Math.floor(arr.length / 2),
        )
        .map((p, i) => (
          <div key={i} className="border border-ink/20 p-2">
            <div className="font-mono text-[0.6rem] uppercase tracking-wider text-graphite">
              {i === 0 ? "start" : i === 1 ? "mid" : "finish"}
            </div>
            <div className="mt-1 font-mono text-xs mono-nums">
              {p.temperature[0]?.toFixed(0)}°C
            </div>
            <div className="font-mono text-xs mono-nums">
              {p.windspeed[0]?.toFixed(1)} m/s
            </div>
          </div>
        ))}
    </div>
  );
}
