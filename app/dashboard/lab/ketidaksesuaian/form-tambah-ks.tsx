"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahKsAction } from "../actions";
import { DAMPAK_KS, KATEGORI_KS, SUMBER_KS } from "@/lib/lab";

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
      {pending ? "Menyimpan..." : "Simpan laporan"}
    </button>
  );
}

export default function FormTambahKs({ hariIni }: { hariIni: string }) {
  const [state, aksi] = useFormState(tambahKsAction, null);
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
        {terbuka ? "− Tutup form" : "+ Laporkan ketidaksesuaian"}
      </button>
      {state?.pesan && (
        <p role={state.sukses ? "status" : "alert"} className={`mt-2 text-sm ${state.sukses ? "text-teal-700" : "text-clay-700"}`}>
          {state.pesan}
        </p>
      )}
      {terbuka && (
        <form ref={formRef} action={aksi} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="space-y-1">
              <span className={labelCls}>Tanggal kejadian</span>
              <input name="tanggal" type="date" defaultValue={hariIni} max={hariIni} className={inputCls} />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Kategori</span>
              <select name="kategori" required defaultValue="" className={inputCls}>
                <option value="" disabled>
                  Pilih
                </option>
                {Object.entries(KATEGORI_KS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Sumber temuan (opsional)</span>
              <select name="sumber" defaultValue="" className={inputCls}>
                <option value="">Tidak ditentukan</option>
                {Object.entries(SUMBER_KS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Dampak</span>
              <select name="dampak" defaultValue="sedang" className={inputCls}>
                {Object.entries(DAMPAK_KS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 sm:col-span-4">
              <span className={labelCls}>Uraian kejadian</span>
              <textarea name="uraian" required rows={3} className={inputCls} placeholder="Apa yang terjadi, kapan, pada pemeriksaan/alat apa" />
            </label>
            <label className="space-y-1 sm:col-span-4">
              <span className={labelCls}>Tindakan segera (opsional)</span>
              <input name="tindakan_segera" className={inputCls} placeholder="mis. pemeriksaan dihentikan, sampel diulang" />
            </label>
          </div>
          <Tombol />
        </form>
      )}
    </div>
  );
}
