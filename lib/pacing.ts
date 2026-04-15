export type PacingStyle = "steady" | "variable" | "surges" | "custom";

export const PACING: Record<
  PacingStyle,
  {
    label: string;
    climbBonus: number; // max fraction above target on steep climbs
    descentRelief: number; // max fraction below target on steep descents
    caption: string;
  }
> = {
  steady: {
    label: "Steady",
    climbBonus: 0.05,
    descentRelief: 0.1,
    caption: "Hold target IF — minimal surges, lowest VI",
  },
  variable: {
    label: "Variable",
    climbBonus: 0.18,
    descentRelief: 0.4,
    caption: "Push climbs, ease over crests, recover on descents",
  },
  surges: {
    label: "Surges",
    climbBonus: 0.28,
    descentRelief: 0.7,
    caption: "Above-threshold kicks on climbs, freewheel descents — highest VI",
  },
  custom: {
    label: "Custom",
    climbBonus: 0.18,
    descentRelief: 0.4,
    caption: "Dial climb and descent percentages yourself",
  },
};

export const PACING_ORDER: PacingStyle[] = [
  "steady",
  "variable",
  "surges",
  "custom",
];
