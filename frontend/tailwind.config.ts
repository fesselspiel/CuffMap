import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#34242b",
        line: "#ead8d2",
        moss: "#788b66",
        clay: "#b86f63",
        skyglass: "#f6e8ee",
        cream: "#fff8f1",
        blush: "#f8dfe7",
        rose: "#a9435d",
        wine: "#743246",
        honey: "#d9a957",
        sage: "#eef5e8"
      }
    }
  },
  plugins: []
};

export default config;
