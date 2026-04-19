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
    climbBonus: 0.06,
    descentRelief: 0.25,
    caption: "Hold target IF — minimal surges, lowest VI",
  },
  variable: {
    label: "Variable",
    climbBonus: 0.22,
    descentRelief: 0.7,
    caption: "Push climbs, ease over crests, coast steep descents",
  },
  surges: {
    label: "Surges",
    climbBonus: 0.32,
    descentRelief: 1.0,
    caption: "Above-threshold kicks on climbs, full freewheel on descents",
  },
  custom: {
    label: "Custom",
    climbBonus: 0.22,
    descentRelief: 0.7,
    caption: "Dial climb and descent percentages yourself",
  },
};

export const PACING_ORDER: PacingStyle[] = [
  "steady",
  "variable",
  "surges",
  "custom",
];
