"use client";

import { useFormState, useFormStatus } from "react-dom";
import { ubahAktifPemeriksaanAction } from "../actions";

function Tombol({ aktif }: { aktif: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm border border-sand-100 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-sand-50 disabled:opacity-60"
    >
      {pending ? "..." : aktif ? "Nonaktifkan" : "Aktifkan"}
    </button>
  );
}

export default function TogglePemeriksaan({ id, aktif }: { id: string; aktif: boolean }) {
  const [state, aksi] = useFormState(ubahAktifPemeriksaanAction, null);
  return (
    <form action={aksi} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="aktif" value={aktif ? "0" : "1"} />
      <Tombol aktif={aktif} />
      {state && !state.sukses && state.pesan && (
        <span role="alert" className="text-xs text-clay-700">
          {state.pesan}
        </span>
      )}
    </form>
  );
}
