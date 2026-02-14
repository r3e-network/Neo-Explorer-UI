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
        // Etherscan-style primary (link blue)
        primary: {
          50: "#eef6fc",
          100: "#d4e9f7",
          200: "#a8d3ef",
          300: "#6db8e3",
          400: "#3a9fd8",
          500: "#0784c3",
          600: "#066a9c",
          700: "#055075",
          800: "#03364e",
          900: "#021c27",
        },
        // Etherscan gray scale
        gray: {
          50: "#f8f9fa",
          100: "#f0f1f3",
          200: "#e7eaf3",
          300: "#d5d9e2",
          400: "#a0aec0",
          500: "#6c757d",
          600: "#4a5568",
          700: "#2d3748",
          800: "#1a202c",
          900: "#0d1117",
        },
        // Etherscan text colors
        text: {
          primary: "#081d35",
          secondary: "#6c757d",
          muted: "#8c98a4",
        },
        // Etherscan header
        header: {
          bg: "#21325b",
          "bg-dark": "#1a1c2e",
        },
        // Etherscan card
        card: {
          border: "#e7eaf3",
          "border-dark": "#2d3748",
        },
        // Status colors (Etherscan)
        success: "#00a186",
        warning: "#db8b00",
        error: "#de4437",
      },
      fontFamily: {
        sans: ['"Helvetica Neue"', "Arial", "sans-serif"],
        mono: ['"JetBrains Mono"', "SFMono-Regular", "Menlo", "monospace"],
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
        card: "0 0.5rem 1.2rem rgba(189,197,209,.2)",
        "card-hover": "0 0.5rem 1.2rem rgba(189,197,209,.4)",
        dropdown: "0 0.5rem 1rem rgba(0, 0, 0, 0.15)",
      },
      borderRadius: {
        DEFAULT: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
