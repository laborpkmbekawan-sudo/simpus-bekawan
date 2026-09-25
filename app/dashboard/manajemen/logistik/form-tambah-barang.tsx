"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahBarangAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

export const LABEL_KATEGORI: Record<string, string> = {
  atk: "ATK",
  rumah_tangga: "Rumah Tangga",
  kebersihan: "Kebersihan",
  percetakan: "Percetakan",
  lainnya: "Lainnya",
};

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Tambah Barang"}
    </button>
  );
}

export default function FormTambahBarang() {
  const [state, formAction] = useFormState(tambahBarangAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && state.pesan === "") formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-card border border-sand-100 bg-white p-5"
    >
      <div className="min-w-[200px] flex-1 space-y-1.5">
        <label htmlFor="nama_barang" className={labelCls}>
          Nama barang
        </label>
        <input id="nama_barang" name="nama_barang" required placeholder="contoh: Kertas A4" className={inputCls} />
      </div>
      <div className="w-40 space-y-1.5">
        <label htmlFor="kategori" className={labelCls}>
          Kategori
        </label>
        <select id="kategori" name="kategori" defaultValue="lainnya" className={inputCls}>
          {Object.entries(LABEL_KATEGORI).map(([nilai, label]) => (
            <option key={nilai} value={nilai}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="w-24 space-y-1.5">
        <label htmlFor="satuan" className={labelCls}>
          Satuan
        </label>
        <input id="satuan" name="satuan" defaultValue="pcs" className={inputCls} />
      </div>
      <div className="w-28 space-y-1.5">
        <label htmlFor="stok_awal" className={labelCls}>
          Stok awal
        </label>
        <input id="stok_awal" name="stok_awal" type="number" step="0.1" defaultValue={0} className={inputCls} />
      </div>
      <div className="w-28 space-y-1.5">
        <label htmlFor="stok_minimum" className={labelCls}>
          Stok minimum
        </label>
        <input id="stok_minimum" name="stok_minimum" type="number" step="0.1" defaultValue={0} className={inputCls} />
      </div>
      <TombolSimpan />
      {state?.pesan && (
        <p role="alert" className="w-full rounded-sm bg-clay-600/10 px-3.5 py-2.5 text-sm text-clay-700">
          {state.pesan}
        </p>
      )}
    </form>
  );
}
