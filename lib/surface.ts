export type Surface =
  | "glass"
  | "tarmac"
  | "chipseal"
  | "rough"
  | "gravel"
  | "cobbles";

export const SURFACES: Record<
  Surface,
  { label: string; crrMul: number; caption: string }
> = {
  glass: {
    label: "Velodrome / Fresh Asphalt",
    crrMul: 0.85,
    caption: "Pristine surface, minimal loss",
  },
  tarmac: {
    label: "Tarmac",
    crrMul: 1.0,
    caption: "Typical good road",
  },
  chipseal: {
    label: "Chipseal",
    crrMul: 1.35,
    caption: "Sealed gravel, US backroads",
  },
  rough: {
    label: "Rough / Patchy",
    crrMul: 1.7,
    caption: "Cracked, patched, weathered",
  },
  gravel: {
    label: "Gravel",
    crrMul: 2.6,
    caption: "Compact dirt or gravel",
  },
  cobbles: {
    label: "Cobbles",
    crrMul: 3.5,
    caption: "Paris–Roubaix territory",
  },
};

export const SURFACE_ORDER: Surface[] = [
  "glass",
  "tarmac",
  "chipseal",
  "rough",
  "gravel",
  "cobbles",
];
