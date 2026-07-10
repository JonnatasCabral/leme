import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-poppins)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // Paleta da identidade visual "Leme": laranja como cor de marca,
        // âmbar/areia como tons quentes de apoio, grafite/cinza como base
        // neutra de texto e superfícies.
        brand: {
          50: "#fff5ee", // Areia
          100: "#ffe7d6", // Âmbar claro
          200: "#ffd1b0",
          300: "#ffb37d",
          400: "#ff8f47",
          500: "#ff6a00", // Laranja Leme
          600: "#e65e00",
          700: "#c24e00",
          800: "#9a3e00",
          900: "#7a3200",
        },
        ink: {
          50: "#f9fafb",
          100: "#f3f4f6", // Cinza claro
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#687280", // Cinza médio
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827", // Grafite
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(17, 24, 39, 0.04), 0 8px 24px -6px rgba(17, 24, 39, 0.08)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
