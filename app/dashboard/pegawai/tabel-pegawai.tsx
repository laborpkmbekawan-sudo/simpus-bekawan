"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ToggleStatus from "./toggle-status";

type Pegawai = {
  id: string;
  nama_lengkap: string;
  jabatan: string | null;
  unit_kerja: string | null;
  peran: string;
  status_aktif: boolean;
  lokasiNama: string;
  peranLabel: string;
  akses: { nama: string; level: string }[];
};

export default function TabelPegawai({
  daftarPegawai,
  isAdmin,
}: {
  daftarPegawai: Pegawai[];
  isAdmin: boolean;
}) {
  const [kataKunci, setKataKunci] = useState("");

  const hasilFilter = useMemo(() => {
    const q = kataKunci.trim().toLowerCase();
    if (!q) return daftarPegawai;
    return daftarPegawai.filter((p) =>
      [p.nama_lengkap, p.jabatan ?? "", p.unit_kerja ?? "", p.lokasiNama, p.peranLabel]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [daftarPegawai, kataKunci]);

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <input
          type="search"
          value={kataKunci}
          onChange={(e) => setKataKunci(e.target.value)}
          placeholder="Cari nama, jabatan, unit, lokasi, atau hak akses..."
          className="w-full rounded-sm border border-teal-700/20 bg-white px-3.5 py-2 text-sm
                     placeholder:text-ink/40 focus:border-teal-700"
        />
      </div>

      <p className="text-xs text-ink/45">
        Menampilkan {hasilFilter.length} dari {daftarPegawai.length} pegawai
      </p>

      <div className="overflow-hidden rounded-sm border border-teal-700/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-teal-700/10 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-5 py-3 font-medium">Nama</th>
              <th className="px-5 py-3 font-medium">Jabatan</th>
              <th className="px-5 py-3 font-medium">Unit kerja</th>
              <th className="px-5 py-3 font-medium">Lokasi</th>
              <th className="px-5 py-3 font-medium">Hak akses</th>
              <th className="px-5 py-3 font-medium">Akses klaster</th>
              <th className="px-5 py-3 font-medium">Status</th>
              {isAdmin && <th className="px-5 py-3 font-medium">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {hasilFilter.map((p) => (
              <tr key={p.id} className="border-b border-teal-700/5 last:border-0">
                <td className="px-5 py-3.5 text-ink">{p.nama_lengkap}</td>
                <td className="px-5 py-3.5 text-ink/70">{p.jabatan || "—"}</td>
                <td className="px-5 py-3.5 text-ink/70">{p.unit_kerja || "—"}</td>
                <td className="px-5 py-3.5 text-ink/70">{p.lokasiNama || "—"}</td>
                <td className="px-5 py-3.5 text-ink/70">{p.peranLabel}</td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {p.akses.map((a, i) => (
                      <span
                        key={i}
                        className={`rounded-sm px-2 py-0.5 text-xs ${
                          a.level === "penuh"
                            ? "bg-teal-700/8 text-teal-700"
                            : "bg-ink/5 text-ink/60"
                        }`}
                        title={a.level === "penuh" ? "Penuh (+ laporan)" : "Layanan saja"}
                      >
                        {a.nama.replace(/^Klaster \d+ - /, "").replace(/^Lintas Klaster - /, "")}
                      </span>
                    ))}
                    {p.akses.length === 0 && <span className="text-xs text-ink/35">—</span>}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  {isAdmin ? (
                    <ToggleStatus pegawaiId={p.id} statusAktif={p.status_aktif} />
                  ) : (
                    <span className="text-xs text-ink/50">
                      {p.status_aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  )}
                </td>
                {isAdmin && (
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/dashboard/pegawai/${p.id}/edit`}
                      className="text-xs text-teal-700 underline decoration-teal-700/30 underline-offset-2"
                    >
                      Edit
                    </Link>
                  </td>
                )}
              </tr>
            ))}
            {hasilFilter.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="px-5 py-6 text-center text-sm text-ink/45">
                  {daftarPegawai.length === 0
                    ? "Belum ada data pegawai."
                    : "Gak ada pegawai yang cocok dengan pencarian."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
