export type Drafting = "solo" | "wheel" | "group" | "peloton";

export const DRAFTING: Record<
  Drafting,
  { label: string; cdaMul: number; caption: string }
> = {
  solo: { label: "Solo", cdaMul: 1.0, caption: "No wheels to follow" },
  wheel: {
    label: "Wheel",
    cdaMul: 0.8,
    caption: "Glued to one rider's wheel",
  },
  group: {
    label: "Small group",
    cdaMul: 0.68,
    caption: "3–4 riders rotating",
  },
  peloton: {
    label: "Peloton",
    cdaMul: 0.55,
    caption: "Tucked inside a full bunch",
  },
};

export const DRAFTING_ORDER: Drafting[] = [
  "solo",
  "wheel",
  "group",
  "peloton",
];

/**
 * Drafting benefit ramps away on climbs — groups splinter, speeds are low,
 * aero is a small share of resistance anyway. No benefit at or above 5%
 * average grade; full benefit at or below 2%. Linear between.
 */
export function effectiveDraftMul(
  baseMul: number,
  gradePct: number,
): number {
  if (baseMul >= 0.999) return 1;
  if (gradePct <= 2) return baseMul;
  if (gradePct >= 5) return 1;
  const ramp = (gradePct - 2) / 3;
  return baseMul + ramp * (1 - baseMul);
}
