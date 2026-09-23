"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { laporMutuAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

function TombolLapor() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Kirim Laporan"}
    </button>
  );
}

export default function FormLaporMutu() {
  const [state, formAction] = useFormState(laporMutuAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-1.5">
        <label htmlFor="tanggal" className={labelCls}>
          Tanggal
        </label>
        <input
          id="tanggal"
          name="tanggal"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="jenis" className={labelCls}>
          Jenis
        </label>
        <select id="jenis" name="jenis" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            Pilih jenis...
          </option>
          <option value="insiden">Insiden keselamatan pasien</option>
          <option value="keluhan">Keluhan</option>
          <option value="ketidaklengkapan_rm">Ketidaklengkapan rekam medis</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="tingkat_risiko" className={labelCls}>
          Tingkat risiko
        </label>
        <select id="tingkat_risiko" name="tingkat_risiko" defaultValue="rendah" className={inputCls}>
          <option value="rendah">Rendah</option>
          <option value="sedang">Sedang</option>
          <option value="tinggi">Tinggi</option>
        </select>
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="uraian" className={labelCls}>
          Uraian kejadian
        </label>
        <textarea id="uraian" name="uraian" required rows={3} className={inputCls} />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="tindakan_awal" className={labelCls}>
          Tindakan awal (kalau ada)
        </label>
        <textarea id="tindakan_awal" name="tindakan_awal" rows={2} className={inputCls} />
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
        <TombolLapor />
      </div>
    </form>
  );
}
