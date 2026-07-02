import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tint: "var(--tint)",
        surface: "var(--surface)",
        label: {
          DEFAULT: "var(--label)",
          secondary: "var(--label-secondary)",
          tertiary: "var(--label-tertiary)",
        },
        ios: {
          green: "var(--green)",
          orange: "var(--orange)",
          red: "var(--red)",
        },
      },
      borderRadius: {
        card: "26px",
        tile: "16px",
        pill: "100px",
      },
      boxShadow: {
        card: "0px 8px 40px rgba(0,0,0,0.12)",
        pill: "0px 2px 8px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
