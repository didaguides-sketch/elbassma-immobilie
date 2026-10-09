import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        globanic: {
          navy: "#0B1E4D",
          blue: "#1E5FD9",
          blueLight: "#3B7DFF",
        },
      },
    },
  },
  plugins: [],
};

export default config;
