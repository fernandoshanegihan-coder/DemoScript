import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F5F1",
        "paper-sunk": "#EFEDE6",
        ink: "#16161A",
        muted: "#5F6068",
        faint: "#8B8B92",
        hairline: "#D9D7D0",
        accent: "#2C4A52",
        flag: "#A93C2C",
        ok: "#2F6B4F",
      },
      fontFamily: {
        ui: ["var(--font-ui)", "system-ui", "sans-serif"],
        script: ["var(--font-script)", "Georgia", "serif"],
      },
      maxWidth: {
        page: "1180px",
      },
    },
  },
  plugins: [],
};

export default config;
