import { LABEL_FLAG, STATUS_LAB, TAHAP_LAB, WARNA_FLAG, WARNA_STATUS_LAB } from "@/lib/lab";

export type HasilBaris = {
  id: string;
  nama_parameter: string;
  satuan: string | null;
  rujukan_teks: string | null;
  nilai: string;
  flag: string | null;
  kritis?: boolean;
  catatan: string | null;
  parameter?: { urutan: number } | null;
};

export type ItemHasil = {
  id: string;
  nama: string;
  hasil: HasilBaris[];
};

export function PilStatusLab({ status }: { status: string }) {
  return (
    <span className={`rounded-sm px-2.5 py-1 text-xs font-semibold ${WARNA_STATUS_LAB[status] ?? "bg-ink/5 text-ink/70"}`}>
      {STATUS_LAB[status] ?? status}
    </span>
  );
}

export function PilPrioritasLab({ prioritas }: { prioritas: string }) {
  if (prioritas !== "cito") return null;
  return <span className="rounded-sm bg-red-500/10 px-2.5 py-1 text-xs font-bold uppercase text-red-600">Cito</span>;
}

// Pelacak progres permintaan: Diminta -> Sampel diterima -> Diproses -> Selesai.
export function PelacakLab({ status }: { status: string }) {
  if (status === "dibatalkan") return null;
  const indeks = TAHAP_LAB.indexOf(status as (typeof TAHAP_LAB)[number]);
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-semibold">
      {TAHAP_LAB.map((t, i) => {
        const lewat = i <= indeks;
        const sekarang = i === indeks;
        return (
          <li key={t} className="flex items-center gap-1.5">
            <span
              className={`rounded-full px-2.5 py-0.5 ${
                sekarang
                  ? "bg-teal-700 text-white"
                  : lewat
                    ? "bg-teal-700/10 text-teal-700"
                    : "bg-sand-100 text-ink/40"
              }`}
            >
              {STATUS_LAB[t]}
            </span>
            {i < TAHAP_LAB.length - 1 && <span className="text-ink/25">›</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function TabelHasilLab({ items }: { items: ItemHasil[] }) {
  return (
    <div className="space-y-4">
      {items.map((it) => {
        const hasil = [...it.hasil].sort((a, b) => (a.parameter?.urutan ?? 0) - (b.parameter?.urutan ?? 0));
        return (
          <div key={it.id}>
            <p className="mb-1.5 text-sm font-bold text-ink">{it.nama}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                    <th className="py-2 pr-4 font-medium">Parameter</th>
                    <th className="py-2 pr-4 font-medium">Hasil</th>
                    <th className="py-2 pr-4 font-medium">Satuan</th>
                    <th className="py-2 pr-4 font-medium">Nilai rujukan</th>
                    <th className="py-2 font-medium">Ket.</th>
                  </tr>
                </thead>
                <tbody>
                  {hasil.map((h) => (
                    <tr key={h.id} className="border-b border-sand-100/70 last:border-0">
                      <td className="py-2 pr-4 text-ink">
                        {h.nama_parameter}
                        {h.catatan && <span className="block text-xs text-ink/45">{h.catatan}</span>}
                      </td>
                      <td className={`py-2 pr-4 ${h.flag && h.flag !== "normal" ? WARNA_FLAG[h.flag] : "font-medium text-ink"}`}>
                        {h.nilai}
                        {h.kritis && (
                          <span className="ml-1.5 rounded-sm bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Kritis</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-ink/60">{h.satuan ?? "—"}</td>
                      <td className="py-2 pr-4 text-ink/60">{h.rujukan_teks || "—"}</td>
                      <td className={`py-2 text-xs ${h.flag ? WARNA_FLAG[h.flag] : "text-ink/40"}`}>
                        {h.flag ? LABEL_FLAG[h.flag] : ""}
                      </td>
                    </tr>
                  ))}
                  {hasil.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-3 text-center text-xs text-ink/45">
                        Belum ada hasil.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
