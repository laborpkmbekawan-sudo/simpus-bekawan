"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { batalkanSkriningAction, catatSkriningAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

const JENIS_SKRINING: { value: string; label: string }[] = [
  { value: "sdidtk", label: "SDIDTK / Tumbuh Kembang" },
  { value: "mtbs", label: "MTBS" },
  { value: "mtbm", label: "MTBM" },
  { value: "gizi", label: "Status Gizi" },
  { value: "anemia", label: "Anemia" },
  { value: "psikososial", label: "Kesehatan Jiwa / Psikososial" },
];

function labelJenis(value: string) {
  return JENIS_SKRINING.find((j) => j.value === value)?.label ?? value;
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

export type SkriningTercatat = {
  id: string;
  jenis_skrining: string;
  klasifikasi: string | null;
  tindak_lanjut: string | null;
  dicatat_pada: string;
};

export default function FormSkrining({
  kunjunganId,
  daftarSkrining,
}: {
  kunjunganId: string;
  daftarSkrining: SkriningTercatat[];
}) {
  const [state, formAction] = useFormState(catatSkriningAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-5">
      <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <input type="hidden" name="kunjungan_id" value={kunjunganId} />

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor="jenis_skrining" className={labelCls}>
            Jenis skrining
          </label>
          <select id="jenis_skrining" name="jenis_skrining" required className={inputCls} defaultValue="">
            <option value="" disabled>
              Pilih jenis skrining...
            </option>
            {JENIS_SKRINING.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="hasil_pemeriksaan" className={labelCls}>
            Hasil pemeriksaan
          </label>
          <input id="hasil_pemeriksaan" name="hasil_pemeriksaan" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="klasifikasi" className={labelCls}>
            Klasifikasi
          </label>
          <input id="klasifikasi" name="klasifikasi" className={inputCls} />
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor="masalah_ditemukan" className={labelCls}>
            Masalah ditemukan
          </label>
          <textarea id="masalah_ditemukan" name="masalah_ditemukan" rows={2} className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="tindakan_skrining" className={labelCls}>
            Tindakan
          </label>
          <input id="tindakan_skrining" name="tindakan_skrining" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="edukasi" className={labelCls}>
            Edukasi
          </label>
          <input id="edukasi" name="edukasi" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="rujukan" className={labelCls}>
            Rujukan
          </label>
          <input id="rujukan" name="rujukan" placeholder="contoh: Rujuk dokter spesialis anak" className={inputCls} />
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor="tindak_lanjut" className={labelCls}>
            Tindak lanjut
          </label>
          <input id="tindak_lanjut" name="tindak_lanjut" className={inputCls} />
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
                <p className="text-sm font-semibold text-ink">{labelJenis(s.jenis_skrining)}</p>
                <button
                  onClick={() => batalkanSkriningAction(s.id, kunjunganId)}
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
