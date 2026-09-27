"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { batalkanKesehatanKerjaAction, catatKesehatanKerjaAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

const LABEL_PAK: Record<string, string> = {
  tidak_ada: "Tidak Ada",
  suspek_pak: "Suspek PAK",
  pak: "Penyakit Akibat Kerja (PAK)",
};

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Pemeriksaan"}
    </button>
  );
}

function Badge({ nilai }: { nilai: string }) {
  if (nilai === "tidak_ada") return <span className="text-ink/40">—</span>;
  return (
    <span className="rounded-sm bg-clay-600/10 px-2 py-0.5 text-xs font-medium text-clay-700">
      {LABEL_PAK[nilai] ?? nilai}
    </span>
  );
}

export type KesehatanKerjaTercatat = {
  id: string;
  jenis_pekerjaan: string | null;
  pajanan_risiko: string | null;
  diagnosis_pak: string;
  tindak_lanjut: string | null;
  dicatat_pada: string;
};

function waktuWib(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });
}

export default function FormKesehatanKerja({
  kunjunganId,
  daftarPemeriksaan,
}: {
  kunjunganId: string;
  daftarPemeriksaan: KesehatanKerjaTercatat[];
}) {
  const [state, formAction] = useFormState(catatKesehatanKerjaAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-5">
      <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <input type="hidden" name="kunjungan_id" value={kunjunganId} />

        <div className="space-y-1.5">
          <label htmlFor="kk_pekerjaan" className={labelCls}>Jenis pekerjaan</label>
          <input id="kk_pekerjaan" name="jenis_pekerjaan" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kk_tempat" className={labelCls}>Tempat kerja</label>
          <input id="kk_tempat" name="tempat_kerja" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kk_lama" className={labelCls}>Lama bekerja (tahun)</label>
          <input id="kk_lama" name="lama_bekerja_tahun" type="number" step="0.5" min="0" className={inputCls} />
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor="kk_pajanan" className={labelCls}>Pajanan risiko</label>
          <input
            id="kk_pajanan"
            name="pajanan_risiko"
            placeholder="contoh: debu, bising, bahan kimia, ergonomi"
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor="kk_keluhan" className={labelCls}>Keluhan terkait kerja</label>
          <textarea id="kk_keluhan" name="keluhan_terkait_kerja" rows={2} className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kk_apd" className={labelCls}>APD digunakan?</label>
          <select id="kk_apd" name="apd_digunakan" defaultValue="tidak" className={inputCls}>
            <option value="tidak">Tidak</option>
            <option value="ya">Ya</option>
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="kk_fisik" className={labelCls}>Hasil pemeriksaan fisik</label>
          <input id="kk_fisik" name="hasil_pemeriksaan_fisik" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kk_pak" className={labelCls}>Diagnosis PAK</label>
          <select id="kk_pak" name="diagnosis_pak" defaultValue="tidak_ada" className={inputCls}>
            {Object.entries(LABEL_PAK).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="kk_rekomendasi" className={labelCls}>Rekomendasi</label>
          <input id="kk_rekomendasi" name="rekomendasi" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kk_rujukan" className={labelCls}>Rujukan</label>
          <input id="kk_rujukan" name="rujukan" className={inputCls} />
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor="kk_tindaklanjut" className={labelCls}>Tindak lanjut</label>
          <input id="kk_tindaklanjut" name="tindak_lanjut" className={inputCls} />
        </div>

        <div className="sm:col-span-3">
          {state?.pesan && (
            <p
              role="alert"
              className={`mb-3 rounded-sm px-3.5 py-2.5 text-sm ${
                state.sukses ? "bg-teal-500/10 text-teal-700" : "bg-clay-600/10 text-clay-700"
              }`}
            >
              {state.pesan}
            </p>
          )}
          <TombolSimpan />
        </div>
      </form>

      <div>
        <p className="mb-2 text-sm font-bold text-ink">Pemeriksaan Tercatat</p>
        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                <th className="px-4 py-2.5 font-medium">Tanggal</th>
                <th className="px-4 py-2.5 font-medium">Pekerjaan</th>
                <th className="px-4 py-2.5 font-medium">Pajanan</th>
                <th className="px-4 py-2.5 font-medium">Diagnosis PAK</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {daftarPemeriksaan.map((p) => (
                <tr key={p.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-4 py-2.5 text-ink/70">{waktuWib(p.dicatat_pada)}</td>
                  <td className="px-4 py-2.5 text-ink">{p.jenis_pekerjaan ?? "—"}</td>
                  <td className="px-4 py-2.5 text-ink/70">{p.pajanan_risiko ?? "—"}</td>
                  <td className="px-4 py-2.5"><Badge nilai={p.diagnosis_pak} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => batalkanKesehatanKerjaAction(p.id, kunjunganId)}
                      className="text-xs font-medium text-clay-700 underline decoration-clay-700/30 underline-offset-2"
                    >
                      Batalkan
                    </button>
                  </td>
                </tr>
              ))}
              {daftarPemeriksaan.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-ink/45">
                    Belum ada pemeriksaan kesehatan kerja tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
