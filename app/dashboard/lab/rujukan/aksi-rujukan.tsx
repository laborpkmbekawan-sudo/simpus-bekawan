"use client";

import { useFormState, useFormStatus } from "react-dom";
import { batalkanRujukanKeluarAction, catatHasilRujukanAction } from "../actions";

function Tombol({ label, bahaya = false }: { label: string; bahaya?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-sm px-3.5 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
        bahaya ? "border border-clay-600/30 text-clay-700 hover:bg-clay-600/10" : "bg-teal-700 text-white hover:bg-teal-900"
      }`}
    >
      {pending ? "Memproses..." : label}
    </button>
  );
}

export default function AksiRujukan({ id }: { id: string }) {
  const [stateHasil, aksiHasil] = useFormState(catatHasilRujukanAction, null);
  const [stateBatal, aksiBatal] = useFormState(batalkanRujukanKeluarAction, null);
  const pesan = stateHasil?.pesan || stateBatal?.pesan;
  const sukses = stateHasil?.pesan ? stateHasil.sukses : stateBatal?.sukses;

  return (
    <div className="space-y-2">
      <form action={aksiHasil} className="space-y-2">
        <input type="hidden" name="id" value={id} />
        <label className="block space-y-1">
          <span className="text-xs font-bold text-ink/70">Hasil dari lab rujukan</span>
          <textarea
            name="hasil_teks"
            required
            rows={3}
            className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3 py-2 text-sm"
            placeholder="Tulis hasil sesuai laporan dari RS/lab (nilai, satuan, rujukan, tanggal)."
          />
        </label>
        <Tombol label="Catat hasil diterima" />
      </form>
      <form action={aksiBatal}>
        <input type="hidden" name="id" value={id} />
        <Tombol label="Batalkan rujukan" bahaya />
      </form>
      {pesan && (
        <p role={sukses ? "status" : "alert"} className={`text-xs ${sukses ? "text-teal-700" : "text-clay-700"}`}>
          {pesan}
        </p>
      )}
    </div>
  );
}
