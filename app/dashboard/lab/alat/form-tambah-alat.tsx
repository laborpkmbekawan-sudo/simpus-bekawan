"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahAlatAction } from "../actions";

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
      {pending ? "Menyimpan..." : "Simpan alat"}
    </button>
  );
}

export default function FormTambahAlat() {
  const [state, aksi] = useFormState(tambahAlatAction, null);
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
        {terbuka ? "− Tutup form" : "+ Tambah alat"}
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
              <span className={labelCls}>Nama alat</span>
              <input name="nama" required className={inputCls} placeholder="mis. Fotometer / Hematology Analyzer" />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Lokasi (opsional)</span>
              <input name="lokasi" className={inputCls} placeholder="Ruang Lab" />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Merk (opsional)</span>
              <input name="merk" className={inputCls} />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Tipe (opsional)</span>
              <input name="tipe" className={inputCls} />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>No. seri (opsional)</span>
              <input name="no_seri" className={inputCls} />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Tanggal pengadaan (opsional)</span>
              <input name="tanggal_pengadaan" type="date" className={inputCls} />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Interval kalibrasi (hari)</span>
              <input name="interval_kalibrasi_hari" inputMode="numeric" className={inputCls} placeholder="mis. 365, kosong = tanpa jadwal" />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Interval pemeliharaan (hari)</span>
              <input name="interval_pemeliharaan_hari" inputMode="numeric" className={inputCls} placeholder="mis. 30, kosong = tanpa jadwal" />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Kalibrasi terakhir (opsional)</span>
              <input name="kalibrasi_terakhir" type="date" className={inputCls} />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Pemeliharaan terakhir (opsional)</span>
              <input name="pemeliharaan_terakhir" type="date" className={inputCls} />
            </label>
            <label className="space-y-1 sm:col-span-3">
              <span className={labelCls}>Catatan (opsional)</span>
              <input name="catatan" className={inputCls} />
            </label>
          </div>
          <p className="text-xs text-ink/50">
            Jadwal berikutnya dihitung otomatis dari tanggal terakhir + interval. Kalau belum pernah dicatat, alat tampil
            &quot;Belum pernah dicatat&quot; sampai ada log pertama.
          </p>
          <Tombol />
        </form>
      )}
    </div>
  );
}
