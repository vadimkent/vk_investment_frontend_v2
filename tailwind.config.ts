import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          primary: "rgb(var(--bg-primary) / <alpha-value>)",
          secondary: "rgb(var(--bg-secondary) / <alpha-value>)",
          muted: "rgb(var(--bg-muted) / <alpha-value>)",
        },
        content: {
          primary: "rgb(var(--text-primary) / <alpha-value>)",
          secondary: "rgb(var(--text-secondary) / <alpha-value>)",
          muted: "rgb(var(--text-muted) / <alpha-value>)",
          "on-accent": "rgb(var(--text-on-accent) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--border-default) / <alpha-value>)",
          input: "rgb(var(--border-input) / <alpha-value>)",
        },
        accent: {
          primary: "rgb(var(--accent-primary) / <alpha-value>)",
          "primary-hover": "rgb(var(--accent-primary-hover) / <alpha-value>)",
        },
        status: {
          error: "rgb(var(--status-error) / <alpha-value>)",
          "error-surface": "rgb(var(--status-error-surface) / <alpha-value>)",
          success: "rgb(var(--status-success) / <alpha-value>)",
          warning: "rgb(var(--status-warning) / <alpha-value>)",
        },
        overlay: "rgb(var(--overlay) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};

export default config;
