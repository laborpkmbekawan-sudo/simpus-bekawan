"use client";

import { useFormState, useFormStatus } from "react-dom";
import { laporKritisAction } from "../../actions";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Catat sudah dilaporkan"}
    </button>
  );
}

export default function FormLaporKritis({ id }: { id: string }) {
  const [state, aksi] = useFormState(laporKritisAction, null);
  return (
    <form action={aksi} className="mt-3 space-y-2">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-bold text-ink/70">Dilaporkan ke (nama petugas/dokter)</span>
          <input
            name="penerima"
            required
            className="w-full rounded-sm border border-sand-100 bg-white px-3 py-2 text-sm"
            placeholder="mis. dr. Andi (sudah dibaca ulang)"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-bold text-ink/70">Catatan (opsional)</span>
          <input name="catatan" className="w-full rounded-sm border border-sand-100 bg-white px-3 py-2 text-sm" placeholder="mis. via telepon" />
        </label>
      </div>
      <Tombol />
      {state?.pesan && (
        <p role={state.sukses ? "status" : "alert"} className={`text-sm ${state.sukses ? "text-teal-700" : "text-clay-700"}`}>
          {state.pesan}
        </p>
      )}
    </form>
  );
}
