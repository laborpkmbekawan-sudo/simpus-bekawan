"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahLaporanPustuAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

export const LABEL_STATUS_LOGISTIK: Record<string, string> = {
  aman: "Aman",
  menipis: "Menipis",
  kosong: "Kosong",
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
      {pending ? "Menyimpan..." : "Catat Laporan"}
    </button>
  );
}

export type LokasiOpsi = { id: string; nama: string };

export default function FormLaporanPustu({ daftarPustu }: { daftarPustu: LokasiOpsi[] }) {
  const [state, formAction] = useFormState(tambahLaporanPustuAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-1.5">
        <label htmlFor="lokasi_id" className={labelCls}>
          Pustu
        </label>
        <select id="lokasi_id" name="lokasi_id" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            Pilih Pustu...
          </option>
          {daftarPustu.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nama}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="bulan" className={labelCls}>
          Bulan laporan
        </label>
        <input
          id="bulan"
          name="bulan"
          type="month"
          required
          defaultValue={new Date().toISOString().slice(0, 7)}
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="status_logistik" className={labelCls}>
          Status logistik
        </label>
        <select id="status_logistik" name="status_logistik" defaultValue="aman" className={inputCls}>
          {Object.entries(LABEL_STATUS_LOGISTIK).map(([nilai, label]) => (
            <option key={nilai} value={nilai}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="jumlah_kunjungan" className={labelCls}>
          Jumlah kunjungan
        </label>
        <input id="jumlah_kunjungan" name="jumlah_kunjungan" type="number" min={0} className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="jumlah_rujukan" className={labelCls}>
          Jumlah rujukan
        </label>
        <input id="jumlah_rujukan" name="jumlah_rujukan" type="number" min={0} className={inputCls} />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="kendala" className={labelCls}>
          Kendala operasional (transportasi, akses pulau/sungai, dll)
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
