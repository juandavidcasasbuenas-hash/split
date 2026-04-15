"use client";
import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { buildCourse, parseGpx } from "@/lib/gpx";

export function useCourseLoader() {
  const setCourse = useStore((s) => s.setCourse);
  const setCourseError = useStore((s) => s.setCourseError);

  const handleFile = async (f: File) => {
    try {
      const text = await f.text();
      const raw = parseGpx(text);
      const c = buildCourse(raw, 100);
      setCourse(c);
    } catch (err: any) {
      setCourseError(err?.message ?? "Failed to parse GPX");
    }
  };

  const loadSample = async () => {
    try {
      const res = await fetch("/sample-course.gpx");
      const txt = await res.text();
      const raw = parseGpx(txt);
      const c = buildCourse(raw, 100);
      setCourse(c);
    } catch (err: any) {
      setCourseError(err?.message ?? "Failed to load sample");
    }
  };

  return { handleFile, loadSample };
}

/** Big inviting empty-state variant used inside the Hero when no course loaded. */
export function CourseLoaderHero() {
  const { handleFile, loadSample } = useCourseLoader();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const courseError = useStore((s) => s.courseError);

  return (
    <div
      className={`border border-ink transition-colors ${
        drag ? "bg-signal/5" : "bg-paper"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) void handleFile(f);
      }}
    >
      <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div>
          <div className="eyebrow">To begin</div>
          <div className="mt-1 font-display text-3xl leading-tight md:text-4xl">
            Load a course.
          </div>
          <div className="mt-1 max-w-md text-sm text-graphite">
            Drop a GPX file anywhere on this page, or start with our rolling
            40&nbsp;km sample loop near Girona, Spain.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadSample}
            className="btn-ink"
          >
            Use sample course <span aria-hidden>→</span>
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => inputRef.current?.click()}
          >
            Upload GPX
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".gpx,application/gpx+xml,text/xml,application/xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </div>
      </div>
      {courseError && (
        <div className="border-t border-signal bg-signal/10 p-3 text-xs text-signal">
          {courseError}
        </div>
      )}
    </div>
  );
}

/** Small "↻ Swap course" link variant for when a course is already loaded. */
export function SwapCourseButton({ className = "" }: { className?: string }) {
  const { handleFile, loadSample } = useCourseLoader();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.18em] text-graphite underline-offset-2 hover:text-signal hover:underline"
      >
        <span aria-hidden>↻</span> Swap course
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-1 w-[220px] border border-ink bg-paper shadow-[4px_4px_0_var(--ink)]"
          onMouseLeave={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => {
              void loadSample();
              setOpen(false);
            }}
            className="w-full border-b border-ink/20 px-3 py-2 text-left text-sm hover:bg-paper2"
          >
            Sample course
          </button>
          <button
            type="button"
            onClick={() => {
              inputRef.current?.click();
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-paper2"
          >
            Upload GPX…
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".gpx,application/gpx+xml,text/xml,application/xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                void handleFile(f);
                setOpen(false);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
