/** @type {import('tailwindcss').Config} */
module.exports = {
  // Use 'purge' for Tailwind CSS v2.x compatibility
  purge: {
    enabled: process.env.NODE_ENV === "production",
    content: ["./index.html", "./public/**/*.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  },
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Neo brand colors
        neo: {
          green: "#00E599",
          dark: "#1A1A2E",
          light: "#F7F8FA",
        },
        // Primary colors
        primary: {
          50: "#E6F7FF",
          100: "#BAE7FF",
          200: "#91D5FF",
          300: "#69C0FF",
          400: "#40A9FF",
          500: "#165DFF",
          600: "#096DD9",
          700: "#0050B3",
          800: "#003A8C",
          900: "#002766",
        },
        // Gray scale
        gray: {
          50: "#F7F8FA",
          100: "#F2F3F5",
          200: "#E5E6EB",
          300: "#C9CDD4",
          400: "#86909C",
          500: "#4E5969",
          600: "#272E3B",
          700: "#1D2129",
          800: "#17171A",
          900: "#0D0D0F",
        },
        // Status colors
        success: "#00B42A",
        warning: "#FF7D00",
        error: "#F53F3F",
        info: "#165DFF",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        card: "0 4px 20px rgba(0, 0, 0, 0.08)",
        "card-hover": "0 8px 30px rgba(0, 0, 0, 0.12)",
        dropdown: "0 4px 12px rgba(0, 0, 0, 0.15)",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
