"use client";

import { useFormState, useFormStatus } from "react-dom";
import { simpanIzinPustuAction } from "../actions";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan izin"}
    </button>
  );
}

export type OpsiPemeriksaanIzin = { id: string; nama: string; kategori: string };

export default function FormIzinPustu({
  lokasiId,
  namaLokasi,
  opsi,
  diizinkan,
}: {
  lokasiId: string;
  namaLokasi: string;
  opsi: OpsiPemeriksaanIzin[];
  diizinkan: string[];
}) {
  const [state, aksi] = useFormState(simpanIzinPustuAction, null);
  const set = new Set(diizinkan);
  return (
    <form action={aksi} className="rounded-card border border-sand-100 bg-white p-5">
      <input type="hidden" name="lokasi_id" value={lokasiId} />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-ink">{namaLokasi}</h2>
        <span className="text-xs text-ink/50">{diizinkan.length} pemeriksaan diizinkan</span>
      </div>
      <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {opsi.map((o) => (
          <label key={o.id} className="flex items-start gap-2 text-sm text-ink">
            <input type="checkbox" name="pemeriksaan_id" value={o.id} defaultChecked={set.has(o.id)} className="mt-0.5" />
            <span>
              {o.nama} <span className="text-xs text-ink/40">· {o.kategori}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
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
