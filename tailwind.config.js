/** @type {import('tailwindcss').Config} */
import plugin from "tailwindcss/plugin";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4CAF50", // Soft Green
        accent: "#03A9F4", // Sky Blue
        background: "#FAFAFA", // Off-White
        surface: "#FFFFFF", // Pure White
        "text-primary": "#212121", // Charcoal
        "text-secondary": "#757575", // Medium Gray
        success: "#A5D6A7", // Light Mint
        warning: "#FF7043", // Coral/Orange
      },
    },
  },
  plugins: [
    plugin(function ({ matchUtilities, theme }) {
      matchUtilities(
        {
          bg: (value) => ({
            backgroundColor: value,
          }),
          text: (value) => ({
            color: value,
          }),
        },
        {
          values: theme("colors"),
        }
      );
    }),
  ],
};
