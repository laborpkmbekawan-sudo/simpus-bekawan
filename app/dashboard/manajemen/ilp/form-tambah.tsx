"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahKegiatanIlpAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

export const LABEL_SIKLUS: Record<string, string> = {
  ibu_hamil: "Ibu Hamil",
  bayi_balita: "Bayi & Balita",
  usia_sekolah_remaja: "Usia Sekolah & Remaja",
  usia_produktif: "Usia Produktif",
  lansia: "Lansia",
};

export const LABEL_JENIS_KEGIATAN: Record<string, string> = {
  kunjungan_rumah: "Kunjungan Rumah",
  pendataan_keluarga_sehat: "Pendataan Keluarga Sehat",
  posyandu_prima: "Posyandu Prima",
  pemantauan_wilayah_setempat: "Pemantauan Wilayah Setempat (PWS)",
  lainnya: "Lainnya",
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
      {pending ? "Menyimpan..." : "Catat Kegiatan"}
    </button>
  );
}

export default function FormTambahKegiatanIlp() {
  const [state, formAction] = useFormState(tambahKegiatanIlpAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-1.5">
        <label htmlFor="tanggal_ilp" className={labelCls}>
          Tanggal
        </label>
        <input
          id="tanggal_ilp"
          name="tanggal"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="siklus_hidup" className={labelCls}>
          Siklus hidup
        </label>
        <select id="siklus_hidup" name="siklus_hidup" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            Pilih siklus...
          </option>
          {Object.entries(LABEL_SIKLUS).map(([nilai, label]) => (
            <option key={nilai} value={nilai}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="jenis_kegiatan" className={labelCls}>
          Jenis kegiatan
        </label>
        <select id="jenis_kegiatan" name="jenis_kegiatan" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            Pilih jenis...
          </option>
          {Object.entries(LABEL_JENIS_KEGIATAN).map(([nilai, label]) => (
            <option key={nilai} value={nilai}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="desa_wilayah" className={labelCls}>
          Desa/wilayah binaan
        </label>
        <input id="desa_wilayah" name="desa_wilayah" required className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="sasaran" className={labelCls}>
          Sasaran
        </label>
        <input id="sasaran" name="sasaran" type="number" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="capaian" className={labelCls}>
          Capaian
        </label>
        <input id="capaian" name="capaian" type="number" className={inputCls} />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="kader_terlibat" className={labelCls}>
          Kader terlibat
        </label>
        <input id="kader_terlibat" name="kader_terlibat" className={inputCls} />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="kendala" className={labelCls}>
          Kendala
        </label>
        <textarea id="kendala" name="kendala" rows={2} className={inputCls} />
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
  );
}
