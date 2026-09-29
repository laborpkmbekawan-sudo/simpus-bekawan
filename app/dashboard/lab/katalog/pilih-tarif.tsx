"use client";

import { useFormState, useFormStatus } from "react-dom";
import { ubahTarifPemeriksaanAction } from "../actions";
import type { OpsiTarif } from "./form-tambah-pemeriksaan";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm border border-sand-100 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-sand-50 disabled:opacity-60"
    >
      {pending ? "..." : "Simpan tarif"}
    </button>
  );
}

export default function PilihTarif({
  id,
  tarifId,
  daftarTarif,
}: {
  id: string;
  tarifId: string | null;
  daftarTarif: OpsiTarif[];
}) {
  const [state, aksi] = useFormState(ubahTarifPemeriksaanAction, null);
  return (
    <form action={aksi} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <select
        name="tarif_layanan_id"
        defaultValue={tarifId ?? ""}
        aria-label="Tarif kasir"
        className="max-w-[260px] rounded-sm border border-sand-100 bg-[#FBFDFF] px-3 py-1.5 text-xs"
      >
        <option value="">Tidak ditagih</option>
        {daftarTarif.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nama_layanan} — Rp {Math.round(Number(t.harga)).toLocaleString("id-ID")}
          </option>
        ))}
      </select>
      <Tombol />
      {state && state.pesan && (
        <span role={state.sukses ? "status" : "alert"} className={`text-xs ${state.sukses ? "text-teal-700" : "text-clay-700"}`}>
          {state.pesan}
        </span>
      )}
    </form>
  );
}
