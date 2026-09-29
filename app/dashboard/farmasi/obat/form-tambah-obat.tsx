"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahObatAction } from "./actions";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Tambah Obat"}
    </button>
  );
}

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

export default function FormTambahObat() {
  const [state, formAction] = useFormState(tambahObatAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && state.pesan === "") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-card border border-sand-100 bg-white p-5 sm:grid-cols-3 lg:grid-cols-6"
    >
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
        <label htmlFor="nama_obat" className={labelCls}>
          Nama obat
        </label>
        <input id="nama_obat" name="nama_obat" required placeholder="contoh: Amoxicillin 500mg" className={inputCls} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="kategori" className={labelCls}>
          Kategori
        </label>
        <input id="kategori" name="kategori" placeholder="contoh: Antibiotik" className={inputCls} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="bentuk_sediaan" className={labelCls}>
          Bentuk sediaan
        </label>
        <input id="bentuk_sediaan" name="bentuk_sediaan" placeholder="contoh: Tablet" className={inputCls} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="satuan" className={labelCls}>
          Satuan
        </label>
        <input id="satuan" name="satuan" defaultValue="tablet" className={inputCls} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="stok_awal" className={labelCls}>
          Stok awal
        </label>
        <input id="stok_awal" name="stok_awal" type="number" step="0.1" defaultValue={0} className={inputCls} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="stok_minimum" className={labelCls}>
          Stok minimum
        </label>
        <input id="stok_minimum" name="stok_minimum" type="number" step="0.1" defaultValue={0} className={inputCls} />
      </div>
      <div className="sm:col-span-3 lg:col-span-6">
        <TombolSimpan />
      </div>
      {state?.pesan && (
        <p role="alert" className="sm:col-span-3 lg:col-span-6 rounded-sm bg-clay-600/10 px-3.5 py-2.5 text-sm text-clay-700">
          {state.pesan}
        </p>
      )}
    </form>
  );
}
