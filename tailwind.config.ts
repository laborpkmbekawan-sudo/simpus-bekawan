import type { Config } from "tailwindcss";

// Token desain SIMPUS UPTD Puskesmas Bekawan.
// Nilai hex diselaraskan persis dengan referensi desain (navy->teal gradasi
// sidebar, aksen oranye, kartu rounded besar). Nama token TETAP SAMA seperti
// sebelumnya (teal-950/900/700/500, sand-50/100, clay-600/700, ink) supaya
// semua className yang sudah ditulis di komponen lain otomatis ikut berubah
// tanpa perlu diedit satu-satu.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          950: "#0D2942", // navy tua -- dipakai sidebar/panel gelap
          900: "#123D5B", // navy sedang -- gradasi tengah sidebar
          700: "#0F766E", // teal utama -- tombol, link, aksen
          500: "#14B8A6", // teal terang -- gradasi bawah sidebar, hover
        },
        sand: {
          50: "#F4F8FB", // bg halaman
          100: "#E8EEF3", // border/garis halus
        },
        clay: {
          600: "#E0793C", // aksen oranye -- warning, highlight aktif
          700: "#B4592A",
        },
        ink: "#183B56",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "10px",
        card: "18px",
      },
    },
  },
  plugins: [],
};

export default config;
