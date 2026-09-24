"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahRisikoAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

const LABEL_KATEGORI: Record<string, string> = {
  pelayanan: "Pelayanan",
  sdm: "SDM",
  logistik: "Logistik",
  keamanan_data: "Keamanan Data",
  lainnya: "Lainnya",
};

export { LABEL_KATEGORI };

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Tambah ke Register"}
    </button>
  );
}

export default function FormTambahRisiko() {
  const [state, formAction] = useFormState(tambahRisikoAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-1.5">
        <label htmlFor="kategori" className={labelCls}>
          Kategori
        </label>
        <select id="kategori" name="kategori" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            Pilih kategori...
          </option>
          {Object.entries(LABEL_KATEGORI).map(([nilai, label]) => (
            <option key={nilai} value={nilai}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="level_risiko" className={labelCls}>
          Level risiko
        </label>
        <select id="level_risiko" name="level_risiko" defaultValue="rendah" className={inputCls}>
          <option value="rendah">Rendah</option>
          <option value="sedang">Sedang</option>
          <option value="tinggi">Tinggi</option>
        </select>
      </div>

      <div />

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="uraian" className={labelCls}>
          Uraian risiko
        </label>
        <textarea id="uraian" name="uraian" required rows={2} className={inputCls} />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="penyebab" className={labelCls}>
          Penyebab (kalau diketahui)
        </label>
        <textarea id="penyebab" name="penyebab" rows={2} className={inputCls} />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="rencana_mitigasi" className={labelCls}>
          Rencana mitigasi
        </label>
        <textarea id="rencana_mitigasi" name="rencana_mitigasi" rows={2} className={inputCls} />
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
