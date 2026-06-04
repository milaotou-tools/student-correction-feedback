import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "#FAF9F6",
        surface1: "#FFFFFF",
        surface2: "#F5F4F0",
        surface3: "#EFEDE9",
        ink: "#141413",
        "ink-hover": "#2A2A28",
        accent: "#0070F3",
        "accent-hover": "#0060DF",
        borderSubtle: "#E8E6E1",
        textPrimary: "#111827",
        textSecondary: "#6B7280",
        stripBlue: "#0070F3",
        stripAmber: "#D97706",
        stripGreen: "#16A34A"
      },
      fontFamily: {
        sans: ["Inter", '"Noto Sans SC"', "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"]
      },
      borderRadius: {
        card: "6px"
      }
    }
  },
  plugins: []
};

export default config;
