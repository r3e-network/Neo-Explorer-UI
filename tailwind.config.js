/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tailwind CSS v3.x syntax
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Neo brand colors (preserved)
        neo: {
          green: "#00E599",
          dark: "#1A1A2E",
          light: "#F7F8FA",
        },
        // Brand primary
        primary: {
          50: "#edf8ff",
          100: "#d6efff",
          200: "#b6e4ff",
          300: "#87d4ff",
          400: "#4cb9f5",
          500: "#1498dd",
          600: "#0f78b0",
          700: "#105f8a",
          800: "#124f72",
          900: "#133f5d",
        },
        // Neutral slate scale
        gray: {
          50: "#f6f8fc",
          100: "#eef2f8",
          200: "#dbe3ef",
          300: "#c4cfdd",
          400: "#97a9bf",
          500: "#6f7f97",
          600: "#52617a",
          700: "#38455d",
          800: "#242f42",
          900: "#121b2b",
        },
        // Semantic text
        text: {
          primary: "#0d223d",
          secondary: "#5f738d",
          muted: "#8797aa",
        },
        // Shell / header
        header: {
          bg: "#0f1f3d",
          "bg-dark": "#0a162b",
        },
        // Surface borders
        card: {
          border: "#dce4f0",
          "border-dark": "#28364d",
        },
        // Status colors
        success: "#0f9f72",
        warning: "#c67a12",
        error: "#d64949",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Manrope"', "ui-sans-serif", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.875rem", { lineHeight: "1.5rem" }],
        lg: ["1rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
      },
      boxShadow: {
        card: "0 10px 30px rgba(17, 35, 63, 0.08)",
        "card-hover": "0 16px 42px rgba(17, 35, 63, 0.14)",
        dropdown: "0 16px 40px rgba(13, 29, 53, 0.18)",
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
    },
  },
  plugins: [],
};
