"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahKontrolQcAction } from "../actions";

export type OpsiParameterQc = { id: string; label: string };

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3 py-2 text-sm";
const labelCls = "text-xs font-bold text-ink/70";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan bahan kontrol"}
    </button>
  );
}

export default function FormTambahKontrol({ daftarParameter }: { daftarParameter: OpsiParameterQc[] }) {
  const [state, aksi] = useFormState(tambahKontrolQcAction, null);
  const [terbuka, setTerbuka] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) {
      formRef.current?.reset();
      setTerbuka(false);
    }
  }, [state]);

  return (
    <div className="rounded-card border border-sand-100 bg-white p-5">
      <button type="button" onClick={() => setTerbuka((t) => !t)} className="text-sm font-bold text-teal-700">
        {terbuka ? "− Tutup form" : "+ Tambah bahan kontrol"}
      </button>
      {state?.pesan && (
        <p role={state.sukses ? "status" : "alert"} className={`mt-2 text-sm ${state.sukses ? "text-teal-700" : "text-clay-700"}`}>
          {state.pesan}
        </p>
      )}
      {terbuka && (
        <form ref={formRef} action={aksi} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 sm:col-span-2">
              <span className={labelCls}>Nama bahan kontrol</span>
              <input name="nama" required className={inputCls} placeholder="mis. Kontrol Glukosa Level 1" />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Level (opsional)</span>
              <input name="level" className={inputCls} placeholder="Normal / Tinggi" />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className={labelCls}>Parameter yang dijaga (opsional)</span>
              <select name="parameter_id" defaultValue="" className={inputCls}>
                <option value="">Tidak ditautkan</option>
                {daftarParameter.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className={labelCls}>No. lot (opsional)</span>
              <input name="lot" className={inputCls} />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Target / rata-rata</span>
              <input name="target" required inputMode="decimal" className={inputCls} />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>SD (dari insert kit)</span>
              <input name="sd" required inputMode="decimal" className={inputCls} />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Satuan (opsional)</span>
              <input name="satuan" className={inputCls} placeholder="mg/dL" />
            </label>
          </div>
          <Tombol />
        </form>
      )}
    </div>
  );
}
