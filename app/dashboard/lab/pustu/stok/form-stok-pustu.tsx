"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { simpanStokPustuAction } from "../actions";

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
      {pending ? "Menyimpan..." : "Simpan stok"}
    </button>
  );
}

export default function FormStokPustu({ bulanIni }: { bulanIni: string }) {
  const [state, aksi] = useFormState(simpanStokPustuAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={aksi} className="space-y-3 rounded-card border border-sand-100 bg-white p-5">
      <h2 className="text-base font-bold text-ink">Catat stok BHP / reagen</h2>
      <p className="text-xs text-ink/50">
        Satu baris per barang per bulan. Kalau barang yang sama di bulan yang sama disimpan lagi, angkanya diperbarui.
      </p>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="space-y-1">
          <span className={labelCls}>Bulan laporan</span>
          <input type="month" name="bulan" defaultValue={bulanIni} max={bulanIni} required className={inputCls} />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className={labelCls}>Nama barang</span>
          <input name="nama_barang" required className={inputCls} placeholder="Mis. Strip gula darah" />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Jenis</span>
          <select name="jenis" defaultValue="bhp" className={inputCls}>
            <option value="bhp">BHP</option>
            <option value="reagen">Reagen</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Satuan</span>
          <input name="satuan" defaultValue="pcs" className={inputCls} />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Stok awal</span>
          <input name="stok_awal" inputMode="decimal" defaultValue="0" className={inputCls} />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Masuk</span>
          <input name="masuk" inputMode="decimal" defaultValue="0" className={inputCls} />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Dipakai</span>
          <input name="dipakai" inputMode="decimal" defaultValue="0" className={inputCls} />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Stok minimum</span>
          <input name="stok_minimum" inputMode="decimal" defaultValue="0" className={inputCls} />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Kadaluarsa terdekat</span>
          <input type="date" name="tanggal_kadaluarsa" className={inputCls} />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className={labelCls}>Catatan</span>
          <input name="catatan" className={inputCls} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Tombol />
        {state?.pesan && (
          <p role={state.sukses ? "status" : "alert"} className={`text-sm ${state.sukses ? "text-teal-700" : "text-clay-700"}`}>
            {state.pesan}
          </p>
        )}
      </div>
    </form>
  );
}
