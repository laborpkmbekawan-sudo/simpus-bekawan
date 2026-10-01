"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahPmeAction } from "../actions";

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
      {pending ? "Menyimpan..." : "Simpan siklus"}
    </button>
  );
}

export default function FormTambahPme({ hariIni }: { hariIni: string }) {
  const [state, aksi] = useFormState(tambahPmeAction, null);
  const [terbuka, setTerbuka] = useState(false);
  const [jenis, setJenis] = useState("kuantitatif");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) {
      formRef.current?.reset();
      setJenis("kuantitatif");
      setTerbuka(false);
    }
  }, [state]);

  return (
    <div className="rounded-card border border-sand-100 bg-white p-5">
      <button type="button" onClick={() => setTerbuka((t) => !t)} className="text-sm font-bold text-teal-700">
        {terbuka ? "− Tutup form" : "+ Catat siklus PME baru"}
      </button>
      {state?.pesan && (
        <p role={state.sukses ? "status" : "alert"} className={`mt-2 text-sm ${state.sukses ? "text-teal-700" : "text-clay-700"}`}>
          {state.pesan}
        </p>
      )}
      {terbuka && (
        <form ref={formRef} action={aksi} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1">
              <span className={labelCls}>Penyelenggara</span>
              <input name="penyelenggara" required className={inputCls} placeholder="mis. BBLK / PNPME" />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Program (opsional)</span>
              <input name="program" className={inputCls} placeholder="mis. Kimia Klinik" />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Siklus</span>
              <input name="siklus" required className={inputCls} placeholder="mis. Siklus 1 2026" />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Parameter yang diuji</span>
              <input name="nama_parameter" required className={inputCls} placeholder="mis. Glukosa / HBsAg" />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Jenis hasil</span>
              <select name="jenis" value={jenis} onChange={(e) => setJenis(e.target.value)} className={inputCls}>
                <option value="kuantitatif">Kuantitatif (angka)</option>
                <option value="kualitatif">Kualitatif (reaktif/non-reaktif dst)</option>
              </select>
            </label>
            {jenis === "kuantitatif" && (
              <label className="space-y-1">
                <span className={labelCls}>Satuan (opsional)</span>
                <input name="satuan" className={inputCls} placeholder="mg/dL" />
              </label>
            )}
            <label className="space-y-1">
              <span className={labelCls}>Tanggal sampel diterima</span>
              <input name="tanggal_terima" type="date" defaultValue={hariIni} max={hariIni} className={inputCls} />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Batas lapor hasil (opsional)</span>
              <input name="batas_lapor" type="date" className={inputCls} />
            </label>
            <label className="space-y-1 sm:col-span-3">
              <span className={labelCls}>Catatan (opsional)</span>
              <input name="catatan" className={inputCls} />
            </label>
          </div>
          <Tombol />
        </form>
      )}
    </div>
  );
}
