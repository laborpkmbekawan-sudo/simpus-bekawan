import type { Config } from "tailwindcss";

// Token desain SIMPUS UPTD Puskesmas Bekawan.
// Palet dijauhkan dari default "SaaS hijau mint generik": dasar teal gelap
// (identitas layanan kesehatan pemerintah) + sand hangat (kertas/arsip),
// aksen clay untuk status/peringatan, bukan gradient dekoratif.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          950: "#0A2E31",
          900: "#0F5257",
          700: "#166B70",
          500: "#2C8B8F",
        },
        sand: {
          50: "#F7F4EE",
          100: "#EFEAE0",
        },
        clay: {
          600: "#C9743A",
          700: "#A85F2E",
        },
        ink: "#1C2B2A",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
