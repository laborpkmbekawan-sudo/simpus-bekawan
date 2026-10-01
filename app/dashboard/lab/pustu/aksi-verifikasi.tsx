"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { verifikasiLaporanPustuAction } from "./actions";

function Tombol({ keputusan, label, utama }: { keputusan: "diverifikasi" | "dikembalikan"; label: string; utama?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="keputusan"
      value={keputusan}
      disabled={pending}
      className={`rounded-sm px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
        utama ? "bg-teal-700 text-white hover:bg-teal-900" : "border border-clay-600/40 text-clay-700 hover:bg-clay-600/5"
      }`}
    >
      {pending ? "Memproses..." : label}
    </button>
  );
}

export default function AksiVerifikasiPustu({ laporanId }: { laporanId: string }) {
  const [state, aksi] = useFormState(verifikasiLaporanPustuAction, null);
  const [catatan, setCatatan] = useState("");

  return (
    <form action={aksi} className="mt-4 space-y-3 border-t border-sand-100 pt-4">
      <input type="hidden" name="id" value={laporanId} />
      <label className="block space-y-1">
        <span className="text-xs font-bold text-ink/70">Catatan verifikasi (wajib kalau dikembalikan)</span>
        <input
          name="catatan_verifikasi"
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3 py-2 text-sm"
          placeholder="Mis. nilai Hb tidak sesuai satuan, mohon cek ulang"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Tombol keputusan="diverifikasi" label="Verifikasi" utama />
        <Tombol keputusan="dikembalikan" label="Kembalikan ke Pustu" />
        {state?.pesan && (
          <span role={state.sukses ? "status" : "alert"} className={`text-sm ${state.sukses ? "text-teal-700" : "text-clay-700"}`}>
            {state.pesan}
          </span>
        )}
      </div>
    </form>
  );
}
