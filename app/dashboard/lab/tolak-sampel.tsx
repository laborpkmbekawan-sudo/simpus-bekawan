"use client";

import { useFormState, useFormStatus } from "react-dom";
import { tolakSampelAction } from "./actions";
import { ALASAN_TOLAK_SAMPEL } from "@/lib/lab";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-clay-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-clay-700/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Memproses..." : "Tolak sampel"}
    </button>
  );
}

export default function TolakSampel({ id }: { id: string }) {
  const [state, aksi] = useFormState(tolakSampelAction, null);
  const cls = "rounded-sm border border-sand-100 bg-[#FBFDFF] px-2.5 py-1.5 text-xs";
  return (
    <details className="rounded-sm border border-clay-600/30 px-3 py-1.5">
      <summary className="cursor-pointer text-xs font-semibold text-clay-700">Tolak sampel</summary>
      <form
        action={aksi}
        onSubmit={(e) => {
          if (!confirm("Tolak sampel ini? Hasil draft yang sudah diisi akan dihapus dan permintaan kembali ke Menunggu Lab.")) {
            e.preventDefault();
          }
        }}
        className="mt-2 space-y-2"
      >
        <input type="hidden" name="id" value={id} />
        <select name="alasan" required defaultValue="" className={`${cls} w-full`}>
          <option value="" disabled>
            Pilih alasan
          </option>
          {ALASAN_TOLAK_SAMPEL.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input name="catatan" className={`${cls} w-full`} placeholder="Catatan untuk klaster (opsional)" />
        <Tombol />
        {state?.pesan && (
          <p role={state.sukses ? "status" : "alert"} className={`text-xs ${state.sukses ? "text-teal-700" : "text-clay-700"}`}>
            {state.pesan}
          </p>
        )}
      </form>
    </details>
  );
}
