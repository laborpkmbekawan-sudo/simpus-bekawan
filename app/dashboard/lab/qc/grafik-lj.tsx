// Grafik Levey-Jennings (SVG statis, dirender di server).
// Garis tengah = target, garis putus = ±1/2/3 SD. Titik berwarna sesuai status.

const WARNA: Record<string, string> = {
  dalam_kendali: "#0f766e",
  peringatan: "#b45309",
  ditolak: "#dc2626",
};

export default function GrafikLj({ titik }: { titik: { z: number; status: string }[] }) {
  if (titik.length === 0) return <p className="text-xs text-ink/40">Belum ada data QC.</p>;

  const L = 360;
  const T = 130;
  const padX = 12;
  const padY = 10;
  const batas = 3.5;
  const yDari = (z: number) => {
    const c = Math.max(-batas, Math.min(batas, z));
    return padY + ((batas - c) / (batas * 2)) * (T - padY * 2);
  };
  const xDari = (i: number) => (titik.length === 1 ? L / 2 : padX + (i * (L - padX * 2)) / (titik.length - 1));

  return (
    <svg viewBox={`0 0 ${L} ${T}`} className="h-auto w-full max-w-md" role="img" aria-label={`Grafik QC ${titik.length} titik`}>
      {[-3, -2, -1, 0, 1, 2, 3].map((g) => (
        <g key={g}>
          <line
            x1={padX}
            x2={L - padX}
            y1={yDari(g)}
            y2={yDari(g)}
            stroke={g === 0 ? "#64748b" : Math.abs(g) === 3 ? "#fca5a5" : "#cbd5e1"}
            strokeWidth={g === 0 ? 1.2 : 1}
            strokeDasharray={g === 0 ? undefined : "3 3"}
          />
          <text x={L - padX + 2} y={yDari(g) + 3} fontSize="8" fill="#94a3b8">
            {g > 0 ? `+${g}` : g}
          </text>
        </g>
      ))}
      {titik.length > 1 && (
        <polyline
          points={titik.map((t, i) => `${xDari(i).toFixed(1)},${yDari(t.z).toFixed(1)}`).join(" ")}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.2"
        />
      )}
      {titik.map((t, i) => (
        <circle key={i} cx={xDari(i)} cy={yDari(t.z)} r="3" fill={WARNA[t.status] ?? WARNA.dalam_kendali} />
      ))}
    </svg>
  );
}
