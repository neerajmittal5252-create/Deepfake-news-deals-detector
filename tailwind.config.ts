import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        "bg-subtle": "#fff8fa",
        surface: "#ffffff",
        "surface-raised": "#fff1f5",
        "surface-border": "#fecdd6",
        "surface-card": "#ffffff",
        brand: {
          50: "#fff1f3",
          100: "#ffe4e8",
          200: "#fecdd6",
          300: "#fda4b4",
          400: "#fb718b",
          500: "#f43f5e",
          600: "#e11d48",
          700: "#be123c",
          800: "#9f1239",
          900: "#881337",
        },
        roseRed: {
          50: "#fff1f2",
          100: "#ffe4e6",
          200: "#fecdd3",
          300: "#fda4af",
          400: "#fb7185",
          500: "#f43f5e",
          600: "#e11d48",
          700: "#be123c",
          800: "#9f1239",
          900: "#881337",
        },
        trust: {
          green: "#10b981",
          yellow: "#f59e0b",
          red: "#e11d48",
        }
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "brand-gradient": "linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #be123c 100%)",
        "brand-glow": "radial-gradient(circle at 50% 50%, rgba(244, 63, 94, 0.15) 0%, transparent 70%)",
        "hero-glow": "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(254, 205, 214, 0.6), transparent 70%)",
      },
      boxShadow: {
        "rose-sm": "0 2px 8px -2px rgba(225, 29, 72, 0.15)",
        "rose-md": "0 8px 24px -6px rgba(225, 29, 72, 0.2)",
        "rose-lg": "0 16px 36px -8px rgba(225, 29, 72, 0.25)",
        "glass": "0 10px 30px 0 rgba(0, 0, 0, 0.04), 0 1px 1px 0 rgba(0, 0, 0, 0.02)",
        "glass-rose": "0 12px 35px -8px rgba(244, 63, 94, 0.12), 0 2px 6px -1px rgba(0, 0, 0, 0.04)",
      },
      animation: {
        "float-slow": "floatSlow 8s ease-in-out infinite",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
        "shimmer": "shimmer 2.5s infinite linear",
        "spin-slow": "spin 12s linear infinite",
      },
      keyframes: {
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px) scale(1)" },
          "50%": { transform: "translateY(-10px) scale(1.02)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "0.9", transform: "scale(1.05)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        }
      }
    },
  },
  plugins: [],
};
export default config;
