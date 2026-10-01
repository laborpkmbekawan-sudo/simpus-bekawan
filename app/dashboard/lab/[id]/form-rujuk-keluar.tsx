"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { rujukKeluarAction } from "../actions";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm border border-teal-700/40 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-700/5 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Rujuk keluar"}
    </button>
  );
}

export default function FormRujukKeluar({ items }: { items: { id: string; nama: string }[] }) {
  const [state, aksi] = useFormState(rujukKeluarAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  const cls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3 py-2 text-sm";
  return (
    <details className="rounded-card border border-sand-100 bg-white p-5">
      <summary className="cursor-pointer text-sm font-bold text-ink">Rujuk pemeriksaan ke RS / lab luar</summary>
      <form ref={formRef} action={aksi} className="mt-4 space-y-3">
        <p className="text-xs text-ink/55">
          Pemeriksaan yang dirujuk keluar dari proses Lab ini (tidak ditagih, tidak memotong BHP). Hasil dari luar dicatat di
          menu Rujukan Lab Keluar.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs font-bold text-ink/70">Pemeriksaan</span>
            <select name="item_id" required defaultValue="" className={cls}>
              <option value="" disabled>
                Pilih pemeriksaan
              </option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nama}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold text-ink/70">Tujuan (RS / lab)</span>
            <input name="tujuan" required className={cls} placeholder="mis. RSUD Arifin Achmad" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold text-ink/70">Alasan (opsional)</span>
            <input name="alasan" className={cls} placeholder="mis. reagen tidak tersedia" />
          </label>
        </div>
        <Tombol />
        {state?.pesan && (
          <p role={state.sukses ? "status" : "alert"} className={`text-sm ${state.sukses ? "text-teal-700" : "text-clay-700"}`}>
            {state.pesan}
          </p>
        )}
      </form>
    </details>
  );
}
