import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F1EADB",
        paper2: "#E8DDC7",
        ink: "#121821",
        ink2: "#1E2836",
        graphite: "#5A6374",
        rule: "#2A3140",
        signal: "#C1432A",
        tail: "#486B4E",
        ochre: "#B48A3C",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-instrument)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        "tight-er": "-0.035em",
      },
    },
  },
  plugins: [],
};
export default config;
