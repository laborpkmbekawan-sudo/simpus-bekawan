// Grafik mini tren satu parameter (SVG statis, dirender di server).
// Titik terakhir diberi warna sesuai penanda hasil.

const WARNA_TITIK: Record<string, string> = {
  normal: "#0f766e",
  rendah: "#b45309",
  tinggi: "#dc2626",
  abnormal: "#dc2626",
};

export default function Sparkline({ titik }: { titik: { nilai: number; flag: string | null }[] }) {
  if (titik.length < 2) return <span className="text-xs text-ink/35">—</span>;

  const L = 110;
  const T = 30;
  const pad = 4;
  const nilai = titik.map((t) => t.nilai);
  const min = Math.min(...nilai);
  const max = Math.max(...nilai);
  const rentang = max - min || 1;

  const koordinat = titik.map((t, i) => {
    const x = pad + (i * (L - pad * 2)) / (titik.length - 1);
    const y = max === min ? T / 2 : T - pad - ((t.nilai - min) / rentang) * (T - pad * 2);
    return { x, y };
  });
  const terakhir = koordinat[koordinat.length - 1];
  const flagTerakhir = titik[titik.length - 1].flag ?? "normal";

  return (
    <svg width={L} height={T} viewBox={`0 0 ${L} ${T}`} role="img" aria-label={`Tren ${titik.length} hasil`}>
      <polyline
        points={koordinat.map((k) => `${k.x.toFixed(1)},${k.y.toFixed(1)}`).join(" ")}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={terakhir.x} cy={terakhir.y} r="3" fill={WARNA_TITIK[flagTerakhir] ?? WARNA_TITIK.normal} />
    </svg>
  );
}
