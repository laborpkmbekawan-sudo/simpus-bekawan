"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahKepatuhanUkpAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

export const LABEL_UNIT: Record<string, string> = {
  poli_umum: "Poli Umum",
  poli_gigi: "Poli Gigi",
  kia_kb: "KIA/KB",
  gawat_darurat: "Gawat Darurat",
  rawat_inap: "Rawat Inap",
  laboratorium: "Laboratorium",
  farmasi: "Farmasi",
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
      {pending ? "Menyimpan..." : "Catat Penilaian"}
    </button>
  );
}

export default function FormTambahKepatuhanUkp() {
  const [state, formAction] = useFormState(tambahKepatuhanUkpAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-1.5">
        <label htmlFor="tanggal_ukp" className={labelCls}>
          Tanggal
        </label>
        <input
          id="tanggal_ukp"
          name="tanggal"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="unit_layanan" className={labelCls}>
          Unit layanan
        </label>
        <select id="unit_layanan" name="unit_layanan" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            Pilih unit...
          </option>
          {Object.entries(LABEL_UNIT).map(([nilai, label]) => (
            <option key={nilai} value={nilai}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="skor_kepatuhan" className={labelCls}>
          Skor kepatuhan (%)
        </label>
        <input id="skor_kepatuhan" name="skor_kepatuhan" type="number" min={0} max={100} step="0.01" className={inputCls} />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="aspek_dinilai" className={labelCls}>
          Aspek yang dinilai
        </label>
        <input id="aspek_dinilai" name="aspek_dinilai" required placeholder="mis. Kepatuhan SOP Triase" className={inputCls} />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="temuan" className={labelCls}>
          Temuan
        </label>
        <textarea id="temuan" name="temuan" rows={2} className={inputCls} />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="rekomendasi" className={labelCls}>
          Rekomendasi
        </label>
        <textarea id="rekomendasi" name="rekomendasi" rows={2} className={inputCls} />
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
