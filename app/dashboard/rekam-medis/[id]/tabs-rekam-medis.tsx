"use client";

import { useState } from "react";

type Pasien = {
  id: string;
  no_rm: string;
  nama_lengkap: string;
  tanggal_lahir: string | null;
  jenis_kelamin: string | null;
  alergi: string | null;
  family_folder: string | null;
};

type Riwayat = {
  id: string;
  tanggal: string;
  status: string;
  penjamin: string | null;
  namaKlaster: string;
  subjektif: string | null;
  objektif: string | null;
  diagnosis: string | null;
  plan: string | null;
  daftarTindakan: string[];
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
  return `${umur} tahun`;
}

export default function TabsRekamMedis({ pasien, riwayat }: { pasien: Pasien; riwayat: Riwayat[] }) {
  const [tabAktif, setTabAktif] = useState<"ringkasan" | "riwayat">("ringkasan");

  return (
    <div className="rounded-card border border-sand-100 bg-white p-6">
      <div className="flex flex-wrap gap-1 border-b border-sand-100 pb-3">
        {[
          { id: "ringkasan", label: "Ringkasan" },
          { id: "riwayat", label: "Riwayat Kunjungan" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTabAktif(tab.id as typeof tabAktif)}
            className={`rounded-sm px-3.5 py-2 text-sm font-medium ${
              tabAktif === tab.id ? "bg-teal-700 text-white" : "text-ink/60 hover:bg-sand-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-5">
        {tabAktif === "ringkasan" && (
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-bold text-ink/70">Jenis kelamin:</span>{" "}
              {pasien.jenis_kelamin === "L" ? "Laki-laki" : pasien.jenis_kelamin === "P" ? "Perempuan" : "—"}
              <span className="ml-4 font-bold text-ink/70">Usia:</span> {hitungUmur(pasien.tanggal_lahir)}
            </p>
            <p>
              <span className="font-bold text-ink/70">Family Folder:</span> {pasien.family_folder || "—"}
            </p>
            <p>
              <span className="font-bold text-ink/70">Alergi:</span>{" "}
              {pasien.alergi ? (
                <span className="rounded-sm bg-clay-600/10 px-2 py-0.5 text-clay-700">{pasien.alergi}</span>
              ) : (
                "Tidak ada catatan alergi"
              )}
            </p>
          </div>
        )}

        {tabAktif === "riwayat" && (
          <div className="space-y-2">
            {riwayat.map((r) => (
              <details key={r.id} className="rounded-sm border border-sand-100 bg-white">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <span className="font-semibold text-ink">
                    {new Date(r.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                    <span className="ml-2 font-normal text-ink/60">{r.namaKlaster}</span>
                  </span>
                  <span className="text-ink/70">{r.diagnosis || "Belum ada diagnosis"}</span>
                </summary>
                <div className="space-y-2 border-t border-sand-100 px-4 py-3 text-sm text-ink/80">
                  <p>
                    <span className="font-bold text-ink/70">Penjamin:</span>{" "}
                    {r.penjamin === "bpjs" ? "BPJS" : r.penjamin === "umum" ? "Umum" : "—"}
                    <span className="ml-4 font-bold text-ink/70">Status:</span> <span className="capitalize">{r.status}</span>
                  </p>
                  <p className="whitespace-pre-line">
                    <span className="font-bold text-ink/70">S (Subjektif):</span> {r.subjektif || "—"}
                  </p>
                  <p className="whitespace-pre-line">
                    <span className="font-bold text-ink/70">O (Objektif):</span> {r.objektif || "—"}
                  </p>
                  <p className="whitespace-pre-line">
                    <span className="font-bold text-ink/70">A (Asesmen):</span> {r.diagnosis || "—"}
                  </p>
                  <p className="whitespace-pre-line">
                    <span className="font-bold text-ink/70">P (Plan):</span> {r.plan || "—"}
                  </p>
                  <p>
                    <span className="font-bold text-ink/70">Tindakan:</span>{" "}
                    {r.daftarTindakan.length > 0 ? r.daftarTindakan.join(", ") : "—"}
                  </p>
                </div>
              </details>
            ))}
            {riwayat.length === 0 && (
              <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/45">
                Belum ada riwayat kunjungan.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
