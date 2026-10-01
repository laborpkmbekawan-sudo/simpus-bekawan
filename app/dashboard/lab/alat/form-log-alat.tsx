"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { catatLogAlatAction, ubahKondisiAlatAction } from "../actions";
import { HASIL_LOG_ALAT, JENIS_LOG_ALAT, KONDISI_ALAT } from "@/lib/lab";

const cls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3 py-2 text-sm";
const labelCls = "text-xs font-bold text-ink/70";

function Tombol({ teks }: { teks: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "..." : teks}
    </button>
  );
}

export default function FormLogAlat({ alatId, kondisi, hariIni }: { alatId: string; kondisi: string; hariIni: string }) {
  const [state, aksi] = useFormState(catatLogAlatAction, null);
  const [stateKondisi, aksiKondisi] = useFormState(ubahKondisiAlatAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.pesan) formRef.current?.reset();
  }, [state]);

  const pesan = state?.pesan || stateKondisi?.pesan;
  const sukses = state?.pesan ? state.sukses : stateKondisi?.sukses;

  return (
    <div className="space-y-3">
      <details className="rounded-sm border border-sand-100 bg-[#FBFDFF] p-3">
        <summary className="cursor-pointer text-sm font-bold text-teal-700">+ Catat kalibrasi / pemeliharaan / perbaikan</summary>
        <form ref={formRef} action={aksi} className="mt-3 space-y-3">
          <input type="hidden" name="alat_id" value={alatId} />
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="space-y-1">
              <span className={labelCls}>Jenis</span>
              <select name="jenis" defaultValue="pemeliharaan" className={cls}>
                {Object.entries(JENIS_LOG_ALAT).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Tanggal</span>
              <input name="tanggal" type="date" required defaultValue={hariIni} max={hariIni} className={cls} />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Hasil</span>
              <select name="hasil" defaultValue="baik" className={cls}>
                {Object.entries(HASIL_LOG_ALAT).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Pelaksana</span>
              <input name="pelaksana" className={cls} placeholder="Teknisi / institusi" />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className={labelCls}>No. sertifikat (opsional)</span>
              <input name="no_sertifikat" className={cls} />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className={labelCls}>Catatan (wajib kalau hasil gagal)</span>
              <input name="catatan" className={cls} />
            </label>
          </div>
          <Tombol teks="Simpan log" />
          <p className="text-xs text-ink/50">Log tidak bisa diubah atau dihapus. Salah catat = tambah catatan koreksi.</p>
        </form>
      </details>

      <form action={aksiKondisi} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={alatId} />
        <label className="flex items-center gap-2 text-xs font-bold text-ink/70">
          Kondisi
          <select name="kondisi" defaultValue={kondisi} className="rounded-sm border border-sand-100 bg-[#FBFDFF] px-2 py-1.5 text-sm font-normal">
            {Object.entries(KONDISI_ALAT).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-sm border border-sand-100 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-sand-50">
          Ubah kondisi
        </button>
      </form>

      {pesan && (
        <p role="alert" className={`rounded-sm px-3 py-2 text-sm ${sukses ? "bg-teal-700/10 text-teal-700" : "bg-red-500/10 text-red-600"}`}>
          {pesan}
        </p>
      )}
    </div>
  );
}
