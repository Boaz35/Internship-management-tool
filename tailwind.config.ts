import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Rubik", "Helvetica Neue", "Arial", "sans-serif"],
        serif: ["Frank Ruhl Libre", "Georgia", "serif"],
      },
      colors: {
        tint: "var(--tint)",
        sun: "var(--sun)",
        forest: "var(--green)",
        terracotta: "var(--terracotta)",
        warn: "var(--warn)",
        surface: "var(--surface)",
        label: {
          DEFAULT: "var(--label)",
          secondary: "var(--label-secondary)",
          tertiary: "var(--label-tertiary)",
        },
      },
      borderRadius: {
        card: "26px",
        tile: "16px",
        pill: "100px",
      },
      boxShadow: {
        ring: "0 0 0 1px #e1e1e1",
      },
    },
  },
  plugins: [],
};

export default config;
