"use client";

import { useMemo, useState } from "react";

const LABEL_STATUS: Record<string, string> = { menunggu: "Menunggu", dipanggil: "Dipanggil", selesai: "Selesai" };
const WARNA_STATUS: Record<string, string> = {
  menunggu: "bg-ink/5 text-ink/60",
  dipanggil: "bg-teal-700/10 text-teal-700",
  selesai: "bg-clay-600/10 text-clay-700",
};

type Baris = {
  kunjunganId: string;
  pasienId: string;
  noRm: string;
  namaPasien: string;
  nomorTampil: string;
  namaKlaster: string;
  jenisKunjungan: string;
  status: string;
};

export default function TabelKunjunganHarian({ daftar }: { daftar: Baris[] }) {
  const [kataKunci, setKataKunci] = useState("");

  const hasilFilter = useMemo(() => {
    const q = kataKunci.trim().toLowerCase();
    if (!q) return daftar;
    return daftar.filter((b) =>
      [b.noRm, b.namaPasien, b.namaKlaster].join(" ").toLowerCase().includes(q)
    );
  }, [daftar, kataKunci]);

  const jumlahSelesai = daftar.filter((b) => b.status === "selesai").length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={kataKunci}
          onChange={(e) => setKataKunci(e.target.value)}
          placeholder="Cari nama / No. RM / klaster..."
          className="w-full max-w-sm rounded-sm border border-sand-100 bg-white px-3.5 py-2 text-sm
                     placeholder:text-ink/40 focus:border-teal-700"
        />
        <p className="text-xs text-ink/50">
          {jumlahSelesai} dari {daftar.length} sudah selesai dilayani
        </p>
      </div>

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-5 py-3 font-medium">No. Antrian</th>
              <th className="px-5 py-3 font-medium">Nama</th>
              <th className="px-5 py-3 font-medium">No RM</th>
              <th className="px-5 py-3 font-medium">Klaster Tujuan</th>
              <th className="px-5 py-3 font-medium">Jenis</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {hasilFilter.map((b) => (
              <tr key={b.kunjunganId} className="border-b border-sand-100/70 last:border-0">
                <td className="px-5 py-3.5 font-medium text-ink">{b.nomorTampil}</td>
                <td className="px-5 py-3.5 text-ink">{b.namaPasien}</td>
                <td className="px-5 py-3.5 text-ink/70">{b.noRm}</td>
                <td className="px-5 py-3.5 text-ink/70">{b.namaKlaster}</td>
                <td className="px-5 py-3.5 capitalize text-ink/70">{b.jenisKunjungan}</td>
                <td className="px-5 py-3.5">
                  <span className={`rounded-sm px-2 py-0.5 text-xs font-medium ${WARNA_STATUS[b.status]}`}>
                    {LABEL_STATUS[b.status] ?? b.status}
                  </span>
                </td>
              </tr>
            ))}
            {hasilFilter.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-sm text-ink/45">
                  {daftar.length === 0 ? "Belum ada kunjungan di tanggal ini." : "Gak ada yang cocok dengan pencarian."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
