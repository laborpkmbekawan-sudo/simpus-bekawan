"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { simpanCatatanKlinisAction } from "./actions";

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
  namaKlaster: string;
  diagnosis: string | null;
};

type KunjunganHariIni = {
  id: string;
  namaKlaster: string;
  diagnosis: string;
  catatanKlinis: string;
  tindakan: string;
} | null;

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

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Catatan"}
    </button>
  );
}

export default function TabsRekamMedis({
  pasien,
  kunjunganHariIni,
  riwayat,
  bolehTulis,
}: {
  pasien: Pasien;
  kunjunganHariIni: KunjunganHariIni;
  riwayat: Riwayat[];
  bolehTulis: boolean;
}) {
  const [tabAktif, setTabAktif] = useState<"ringkasan" | "catatan" | "riwayat">("ringkasan");
  const [state, formAction] = useFormState(simpanCatatanKlinisAction, null);

  return (
    <div className="rounded-card border border-sand-100 bg-white p-6">
      <div className="flex gap-1 border-b border-sand-100 pb-3">
        {[
          { id: "ringkasan", label: "Ringkasan" },
          { id: "catatan", label: "Catatan Klinis" },
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

        {tabAktif === "catatan" && (
          <div>
            {!kunjunganHariIni ? (
              <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/50">
                Belum ada kunjungan hari ini untuk pasien ini. Daftarkan kunjungan dulu dari Data Pasien.
              </p>
            ) : !bolehTulis ? (
              <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/50">
                Cuma tenaga klinis (dokter/perawat/bidan/admin) yang boleh isi catatan ini.
              </p>
            ) : (
              <form action={formAction} className="space-y-4">
                <input type="hidden" name="kunjungan_id" value={kunjunganHariIni.id} />
                <input type="hidden" name="pasien_id" value={pasien.id} />

                <p className="text-xs uppercase tracking-wide text-ink/40">
                  Kunjungan hari ini · {kunjunganHariIni.namaKlaster}
                </p>

                <div className="space-y-1.5">
                  <label htmlFor="diagnosis" className="text-sm font-bold text-ink/80">
                    Diagnosis
                  </label>
                  <input
                    id="diagnosis"
                    name="diagnosis"
                    defaultValue={kunjunganHariIni.diagnosis}
                    className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="catatan_klinis" className="text-sm font-bold text-ink/80">
                    Catatan klinis
                  </label>
                  <textarea
                    id="catatan_klinis"
                    name="catatan_klinis"
                    rows={5}
                    defaultValue={kunjunganHariIni.catatanKlinis}
                    placeholder="Hasil pemeriksaan, temuan klinis, dst..."
                    className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="tindakan" className="text-sm font-bold text-ink/80">
                    Tindakan
                  </label>
                  <input
                    id="tindakan"
                    name="tindakan"
                    defaultValue={kunjunganHariIni.tindakan}
                    placeholder="contoh: Pemberian resep, edukasi, rujuk lab"
                    className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
                  />
                </div>

                {state?.pesan && (
                  <p
                    role="alert"
                    className={`rounded-sm px-3.5 py-2.5 text-sm ${
                      state.sukses ? "bg-teal-500/10 text-teal-700" : "bg-clay-600/10 text-clay-700"
                    }`}
                  >
                    {state.pesan}
                  </p>
                )}

                <TombolSimpan />
              </form>
            )}
          </div>
        )}

        {tabAktif === "riwayat" && (
          <div className="overflow-hidden rounded-sm border border-sand-100">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                  <th className="px-4 py-2.5 font-medium">Tanggal</th>
                  <th className="px-4 py-2.5 font-medium">Klaster</th>
                  <th className="px-4 py-2.5 font-medium">Diagnosis</th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map((r) => (
                  <tr key={r.id} className="border-b border-sand-100/70 last:border-0">
                    <td className="px-4 py-2.5 text-ink">
                      {new Date(r.tanggal).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-ink/70">{r.namaKlaster}</td>
                    <td className="px-4 py-2.5 text-ink/70">{r.diagnosis || "—"}</td>
                  </tr>
                ))}
                {riwayat.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-sm text-ink/45">
                      Belum ada riwayat kunjungan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
