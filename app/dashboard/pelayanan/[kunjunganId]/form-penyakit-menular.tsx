"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { batalkanPenyakitMenularAction, catatPenyakitMenularAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

const LABEL_TB: Record<string, string> = {
  tidak_diperiksa: "Tidak Diperiksa",
  negatif: "Negatif",
  positif_bakteriologis: "Positif Bakteriologis",
  positif_klinis: "Positif Klinis",
};

const LABEL_STATUS_TB: Record<string, string> = {
  tidak_menjalani: "Tidak Menjalani Pengobatan",
  baru_mulai: "Baru Mulai",
  dalam_pengobatan: "Dalam Pengobatan",
  selesai_sembuh: "Selesai/Sembuh",
  putus_obat: "Putus Obat",
};

const LABEL_HIV: Record<string, string> = { tidak_diperiksa: "Tidak Diperiksa", non_reaktif: "Non-Reaktif", reaktif: "Reaktif" };
const LABEL_IMS: Record<string, string> = { tidak_diperiksa: "Tidak Diperiksa", negatif: "Negatif", positif: "Positif" };

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Skrining"}
    </button>
  );
}

function Badge({ nilai, label }: { nilai: string; label: Record<string, string> }) {
  if (nilai === "tidak_diperiksa" || nilai === "tidak_menjalani") return <span className="text-ink/40">—</span>;
  const perluPerhatian = ["positif_bakteriologis", "positif_klinis", "reaktif", "positif", "putus_obat"].includes(nilai);
  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
        perluPerhatian ? "bg-clay-600/10 text-clay-700" : "bg-teal-700/10 text-teal-700"
      }`}
    >
      {label[nilai]}
    </span>
  );
}

export type PenyakitMenularTercatat = {
  id: string;
  hasil_pemeriksaan_tb: string;
  status_pengobatan_tb: string;
  hasil_hiv: string;
  hasil_ims: string;
  tindak_lanjut: string | null;
  dicatat_pada: string;
};

function waktuWib(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });
}

export default function FormPenyakitMenular({
  kunjunganId,
  kelompokUsia,
  daftarPemeriksaan,
}: {
  kunjunganId: string;
  kelompokUsia: "dewasa" | "lansia";
  daftarPemeriksaan: PenyakitMenularTercatat[];
}) {
  const [state, formAction] = useFormState(catatPenyakitMenularAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-5">
      <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <input type="hidden" name="kunjungan_id" value={kunjunganId} />
        <input type="hidden" name="kelompok_usia" value={kelompokUsia} />

        <p className="text-sm font-bold text-ink sm:col-span-3">Tuberkulosis (TB)</p>

        <div className="flex items-center gap-2 sm:col-span-3">
          <input id="pm_terduga_tb" name="terduga_tb" type="checkbox" value="ya" className="h-4 w-4 rounded-sm border-sand-100" />
          <label htmlFor="pm_terduga_tb" className="text-sm text-ink/80">
            Terduga TB (batuk &gt; 2 minggu / gejala penyerta)
          </label>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="pm_gejala_tb" className={labelCls}>Gejala TB</label>
          <input id="pm_gejala_tb" name="gejala_tb" placeholder="contoh: Batuk 3 minggu, demam, BB turun" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="pm_hasil_tb" className={labelCls}>Hasil pemeriksaan TB</label>
          <select id="pm_hasil_tb" name="hasil_pemeriksaan_tb" defaultValue="tidak_diperiksa" className={inputCls}>
            {Object.entries(LABEL_TB).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor="pm_status_tb" className={labelCls}>Status pengobatan TB</label>
          <select id="pm_status_tb" name="status_pengobatan_tb" defaultValue="tidak_menjalani" className={inputCls}>
            {Object.entries(LABEL_STATUS_TB).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <p className="text-sm font-bold text-ink sm:col-span-3">HIV</p>

        <div className="space-y-1.5">
          <label htmlFor="pm_hasil_hiv" className={labelCls}>Hasil tes HIV</label>
          <select id="pm_hasil_hiv" name="hasil_hiv" defaultValue="tidak_diperiksa" className={inputCls}>
            {Object.entries(LABEL_HIV).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="pm_risiko_hiv" className={labelCls}>Kelompok risiko (kalau ada)</label>
          <input id="pm_risiko_hiv" name="kelompok_risiko_hiv" className={inputCls} />
        </div>

        <p className="text-sm font-bold text-ink sm:col-span-3">Infeksi Menular Seksual (IMS)</p>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="pm_gejala_ims" className={labelCls}>Gejala IMS</label>
          <input id="pm_gejala_ims" name="gejala_ims" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="pm_hasil_ims" className={labelCls}>Hasil pemeriksaan IMS</label>
          <select id="pm_hasil_ims" name="hasil_ims" defaultValue="tidak_diperiksa" className={inputCls}>
            {Object.entries(LABEL_IMS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor="pm_jenis_ims" className={labelCls}>Jenis IMS (kalau positif)</label>
          <input id="pm_jenis_ims" name="jenis_ims" className={inputCls} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="pm_konseling" className={labelCls}>Konseling diberikan</label>
          <input id="pm_konseling" name="konseling_diberikan" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="pm_rujukan" className={labelCls}>Rujukan</label>
          <input id="pm_rujukan" name="rujukan" className={inputCls} />
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor="pm_tindaklanjut" className={labelCls}>Tindak lanjut</label>
          <input id="pm_tindaklanjut" name="tindak_lanjut" className={inputCls} />
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
        <p className="mb-2 text-sm font-bold text-ink">Skrining Tercatat</p>
        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                <th className="px-4 py-2.5 font-medium">Tanggal</th>
                <th className="px-4 py-2.5 font-medium">TB</th>
                <th className="px-4 py-2.5 font-medium">Status Obat TB</th>
                <th className="px-4 py-2.5 font-medium">HIV</th>
                <th className="px-4 py-2.5 font-medium">IMS</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {daftarPemeriksaan.map((p) => (
                <tr key={p.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-4 py-2.5 text-ink/70">{waktuWib(p.dicatat_pada)}</td>
                  <td className="px-4 py-2.5"><Badge nilai={p.hasil_pemeriksaan_tb} label={LABEL_TB} /></td>
                  <td className="px-4 py-2.5"><Badge nilai={p.status_pengobatan_tb} label={LABEL_STATUS_TB} /></td>
                  <td className="px-4 py-2.5"><Badge nilai={p.hasil_hiv} label={LABEL_HIV} /></td>
                  <td className="px-4 py-2.5"><Badge nilai={p.hasil_ims} label={LABEL_IMS} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => batalkanPenyakitMenularAction(p.id, kunjunganId)}
                      className="text-xs font-medium text-clay-700 underline decoration-clay-700/30 underline-offset-2"
                    >
                      Batalkan
                    </button>
                  </td>
                </tr>
              ))}
              {daftarPemeriksaan.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-ink/45">
                    Belum ada skrining penyakit menular tercatat.
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
