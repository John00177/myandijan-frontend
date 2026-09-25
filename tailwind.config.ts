import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0B1120",
        surface: "#111827",
        card: "#1E293B",
        elevated: "#243447",
        ink: "#F8FAFC",
        "ink-body": "#CBD5E1",
        "ink-muted": "#94A3B8",
        primary: "#3B82F6",
        accent: "#06B6D4",
        secondary: "#8B5CF6",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        border: "rgba(255,255,255,0.08)",
        // Monetization palette. The app's existing dark/blue theme stays the
        // base; these are the accents that mark paid placements so "premium"
        // reads instantly without re-theming every existing surface.
        gold: "#FFD700",
        "gold-deep": "#B8860B",
        silver: "#C0C7D0",
        bronze: "#CD7F32",
        navy: "#1A3A5C",
        "brand-green": "#2E7D32",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        btn: "12px",
        badge: "999px",
      },
      boxShadow: {
        card: "0 4px 6px -1px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(255,255,255,0.05)",
      },
      maxWidth: {
        "7xl": "80rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
