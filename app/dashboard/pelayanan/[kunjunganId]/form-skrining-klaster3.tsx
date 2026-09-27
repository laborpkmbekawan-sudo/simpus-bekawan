"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { batalkanSkriningKlaster3Action, catatSkriningKlaster3Action } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

const JENIS_DEWASA: { value: string; label: string }[] = [
  { value: "pemeriksaan_umum", label: "Pemeriksaan Umum" },
  { value: "skrining_ptm", label: "Skrining PTM" },
  { value: "skrining_kanker_talasemia", label: "Skrining Kanker & Talasemia" },
  { value: "skrining_penyakit_menular", label: "Skrining Penyakit Menular" },
  { value: "kesehatan_reproduksi_caten", label: "Kesehatan Reproduksi & Caten" },
  { value: "skrining_imunisasi_wus", label: "Skrining Imunisasi WUS" },
  { value: "skrining_jiwa_kebugaran", label: "Skrining Jiwa & Kebugaran" },
  { value: "kesehatan_kerja", label: "Kesehatan Kerja" },
];

const JENIS_LANSIA: { value: string; label: string }[] = [
  { value: "pemeriksaan_umum_ptm_lansia", label: "Pemeriksaan Umum & PTM" },
  { value: "skrining_geriatri", label: "Skrining Geriatri" },
  { value: "skrining_indera_penglihatan", label: "Skrining Indera Penglihatan" },
  { value: "skrining_penyakit_menular", label: "Skrining Penyakit Menular" },
  { value: "terapi_terpadu_lansia", label: "Terapi Terpadu Lansia" },
];

function labelJenis(kelompokUsia: string, value: string) {
  const daftar = kelompokUsia === "lansia" ? JENIS_LANSIA : JENIS_DEWASA;
  return daftar.find((j) => j.value === value)?.label ?? value;
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
      {pending ? "Menyimpan..." : "Catat Skrining"}
    </button>
  );
}

export type SkriningKlaster3Tercatat = {
  id: string;
  jenis_skrining: string;
  klasifikasi: string | null;
  tindak_lanjut: string | null;
  dicatat_pada: string;
};

export default function FormSkriningKlaster3({
  kunjunganId,
  kelompokUsia,
  daftarSkrining,
}: {
  kunjunganId: string;
  kelompokUsia: "dewasa" | "lansia";
  daftarSkrining: SkriningKlaster3Tercatat[];
}) {
  const [state, formAction] = useFormState(catatSkriningKlaster3Action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const daftarJenis = kelompokUsia === "lansia" ? JENIS_LANSIA : JENIS_DEWASA;

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-5">
      <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <input type="hidden" name="kunjungan_id" value={kunjunganId} />
        <input type="hidden" name="kelompok_usia" value={kelompokUsia} />

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor={`jenis_skrining_${kelompokUsia}`} className={labelCls}>
            Jenis skrining
          </label>
          <select id={`jenis_skrining_${kelompokUsia}`} name="jenis_skrining" required className={inputCls} defaultValue="">
            <option value="" disabled>
              Pilih jenis skrining...
            </option>
            {daftarJenis.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor={`hasil_pemeriksaan_${kelompokUsia}`} className={labelCls}>
            Hasil pemeriksaan
          </label>
          <input id={`hasil_pemeriksaan_${kelompokUsia}`} name="hasil_pemeriksaan" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`klasifikasi_${kelompokUsia}`} className={labelCls}>
            Klasifikasi
          </label>
          <input id={`klasifikasi_${kelompokUsia}`} name="klasifikasi" className={inputCls} />
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor={`masalah_ditemukan_${kelompokUsia}`} className={labelCls}>
            Masalah ditemukan
          </label>
          <textarea id={`masalah_ditemukan_${kelompokUsia}`} name="masalah_ditemukan" rows={2} className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`tindakan_skrining_${kelompokUsia}`} className={labelCls}>
            Tindakan
          </label>
          <input id={`tindakan_skrining_${kelompokUsia}`} name="tindakan_skrining" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`edukasi_${kelompokUsia}`} className={labelCls}>
            Edukasi
          </label>
          <input id={`edukasi_${kelompokUsia}`} name="edukasi" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`rujukan_${kelompokUsia}`} className={labelCls}>
            Rujukan
          </label>
          <input id={`rujukan_${kelompokUsia}`} name="rujukan" placeholder="contoh: Rujuk dokter spesialis penyakit dalam" className={inputCls} />
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor={`tindak_lanjut_${kelompokUsia}`} className={labelCls}>
            Tindak lanjut
          </label>
          <input id={`tindak_lanjut_${kelompokUsia}`} name="tindak_lanjut" className={inputCls} />
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
        <div className="space-y-2">
          {daftarSkrining.map((s) => (
            <div key={s.id} className="rounded-sm border border-sand-100 bg-white p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">{labelJenis(kelompokUsia, s.jenis_skrining)}</p>
                <button
                  onClick={() => batalkanSkriningKlaster3Action(s.id, kunjunganId)}
                  className="text-xs font-medium text-clay-700 underline decoration-clay-700/30 underline-offset-2"
                >
                  Batalkan
                </button>
              </div>
              {(s.klasifikasi || s.tindak_lanjut) && (
                <p className="mt-1 text-xs text-ink/50">
                  {[s.klasifikasi, s.tindak_lanjut].filter(Boolean).join(" — ")}
                </p>
              )}
            </div>
          ))}
          {daftarSkrining.length === 0 && (
            <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/45">
              Belum ada skrining tercatat.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
