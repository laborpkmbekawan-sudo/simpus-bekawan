"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { catatQcAction, ubahAktifKontrolQcAction } from "../actions";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "..." : "Catat QC hari ini"}
    </button>
  );
}

export default function FormInputQc({ id, aktif, satuan }: { id: string; aktif: boolean; satuan: string | null }) {
  const [state, aksi] = useFormState(catatQcAction, null);
  const [stateAktif, aksiAktif] = useFormState(ubahAktifKontrolQcAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.pesan) formRef.current?.reset();
  }, [state]);

  const cls = "rounded-sm border border-sand-100 bg-[#FBFDFF] px-3 py-2 text-sm";
  return (
    <div className="space-y-2">
      {aktif && (
        <form ref={formRef} action={aksi} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="kontrol_id" value={id} />
          <label className="space-y-1">
            <span className="text-xs font-bold text-ink/70">Nilai terukur{satuan ? ` (${satuan})` : ""}</span>
            <input name="nilai" required inputMode="decimal" className={`${cls} w-32`} />
          </label>
          <label className="min-w-[160px] flex-1 space-y-1">
            <span className="text-xs font-bold text-ink/70">Catatan (opsional)</span>
            <input name="catatan" className={`${cls} w-full`} placeholder="mis. ulang setelah kalibrasi" />
          </label>
          <Tombol />
        </form>
      )}
      <form action={aksiAktif} className="flex items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="aktif" value={aktif ? "false" : "true"} />
        <button type="submit" className="text-xs font-medium text-ink/55 underline decoration-ink/20 underline-offset-2">
          {aktif ? "Nonaktifkan bahan kontrol" : "Aktifkan kembali"}
        </button>
      </form>
      {(state?.pesan || stateAktif?.pesan) && (
        <p
          role="alert"
          className={`rounded-sm px-3 py-2 text-sm ${
            (state?.pesan ? state.sukses : stateAktif?.sukses) ? "bg-teal-700/10 text-teal-700" : "bg-red-500/10 text-red-600"
          }`}
        >
          {state?.pesan || stateAktif?.pesan}
        </p>
      )}
    </div>
  );
}
