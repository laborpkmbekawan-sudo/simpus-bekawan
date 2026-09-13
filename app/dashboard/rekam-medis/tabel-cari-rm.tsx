"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Pasien = { id: string; no_rm: string; nik: string | null; nama_lengkap: string };

export default function TabelCariRm({ daftarPasien }: { daftarPasien: Pasien[] }) {
  const [kataKunci, setKataKunci] = useState("");

  const hasil = useMemo(() => {
    const q = kataKunci.trim().toLowerCase();
    if (!q) return [];
    return daftarPasien.filter((p) =>
      [p.no_rm, p.nik ?? "", p.nama_lengkap].join(" ").toLowerCase().includes(q)
    );
  }, [daftarPasien, kataKunci]);

  return (
    <div className="space-y-3">
      <input
        type="search"
        autoFocus
        value={kataKunci}
        onChange={(e) => setKataKunci(e.target.value)}
        placeholder="Ketik NIK / No. RM / Nama pasien..."
        className="w-full max-w-md rounded-sm border border-sand-100 bg-white px-3.5 py-2.5 text-sm
                   placeholder:text-ink/40 focus:border-teal-700"
      />

      {kataKunci.trim() === "" ? (
        <p className="rounded-card border border-sand-100 bg-white px-5 py-8 text-center text-sm text-ink/45">
          Ketik nama, NIK, atau No. RM buat mulai cari.
        </p>
      ) : (
        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                <th className="px-5 py-3 font-medium">No RM</th>
                <th className="px-5 py-3 font-medium">Nama</th>
                <th className="px-5 py-3 font-medium">NIK</th>
                <th className="px-5 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {hasil.map((p) => (
                <tr key={p.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-5 py-3.5 font-medium text-ink">{p.no_rm}</td>
                  <td className="px-5 py-3.5 text-ink">{p.nama_lengkap}</td>
                  <td className="px-5 py-3.5 text-ink/70">{p.nik || "—"}</td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/dashboard/rekam-medis/${p.id}`}
                      className="text-xs font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
                    >
                      Buka Rekam Medis
                    </Link>
                  </td>
                </tr>
              ))}
              {hasil.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-sm text-ink/45">
                    Gak ada pasien yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
