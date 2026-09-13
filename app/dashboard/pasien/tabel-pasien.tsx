"use client";

import { useMemo, useState } from "react";

type Pasien = {
  id: string;
  no_rm: string;
  nik: string | null;
  nama_lengkap: string;
  tanggal_lahir: string | null;
  jenis_kelamin: string | null;
  alamat: string | null;
};

function hitungUmur(tanggalLahir: string | null) {
  if (!tanggalLahir) return "—";
  const lahir = new Date(tanggalLahir);
  const sekarang = new Date();
  let umur = sekarang.getFullYear() - lahir.getFullYear();
  const belumUlangTahun =
    sekarang.getMonth() < lahir.getMonth() ||
    (sekarang.getMonth() === lahir.getMonth() && sekarang.getDate() < lahir.getDate());
  if (belumUlangTahun) umur -= 1;
  return `${umur} th`;
}

export default function TabelPasien({
  daftarPasien,
  idBaruDisorot,
}: {
  daftarPasien: Pasien[];
  idBaruDisorot?: string;
}) {
  const [kataKunci, setKataKunci] = useState("");

  const hasilFilter = useMemo(() => {
    const q = kataKunci.trim().toLowerCase();
    if (!q) return daftarPasien;
    return daftarPasien.filter((p) =>
      [p.no_rm, p.nik ?? "", p.nama_lengkap, p.alamat ?? ""].join(" ").toLowerCase().includes(q)
    );
  }, [daftarPasien, kataKunci]);

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={kataKunci}
        onChange={(e) => setKataKunci(e.target.value)}
        placeholder="Cari NIK / No. RM / Nama..."
        className="w-full max-w-sm rounded-sm border border-sand-100 bg-white px-3.5 py-2 text-sm
                   placeholder:text-ink/40 focus:border-teal-700"
      />

      <p className="text-xs text-ink/45">
        Menampilkan {hasilFilter.length} dari {daftarPasien.length} pasien
      </p>

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-5 py-3 font-medium">No RM</th>
              <th className="px-5 py-3 font-medium">Nama</th>
              <th className="px-5 py-3 font-medium">NIK</th>
              <th className="px-5 py-3 font-medium">Umur</th>
              <th className="px-5 py-3 font-medium">L/P</th>
              <th className="px-5 py-3 font-medium">Alamat</th>
              <th className="px-5 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {hasilFilter.map((p) => (
              <tr
                key={p.id}
                className={`border-b border-sand-100/70 last:border-0 ${
                  p.id === idBaruDisorot ? "bg-teal-500/10" : ""
                }`}
              >
                <td className="px-5 py-3.5 font-medium text-ink">{p.no_rm}</td>
                <td className="px-5 py-3.5 text-ink">{p.nama_lengkap}</td>
                <td className="px-5 py-3.5 text-ink/70">{p.nik || "—"}</td>
                <td className="px-5 py-3.5 text-ink/70">{hitungUmur(p.tanggal_lahir)}</td>
                <td className="px-5 py-3.5 text-ink/70">{p.jenis_kelamin || "—"}</td>
                <td className="px-5 py-3.5 text-ink/70">{p.alamat || "—"}</td>
                <td className="px-5 py-3.5">
                  <span className="text-xs font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2">
                    Daftar Kunjungan
                  </span>
                </td>
              </tr>
            ))}
            {hasilFilter.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-center text-sm text-ink/45">
                  {daftarPasien.length === 0
                    ? "Belum ada data pasien."
                    : "Gak ada pasien yang cocok dengan pencarian."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
