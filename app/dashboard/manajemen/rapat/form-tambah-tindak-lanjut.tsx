"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahTindakLanjutAction } from "./actions";

const inputCls = "rounded-sm border border-sand-100 bg-[#FBFDFF] px-2.5 py-1.5 text-xs";

function TombolTambahKecil() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "..." : "Tambah"}
    </button>
  );
}

export type PegawaiRingkas = { id: string; nama_lengkap: string };

export default function FormTambahTindakLanjut({
  rapatId,
  daftarPegawai,
}: {
  rapatId: string;
  daftarPegawai: PegawaiRingkas[];
}) {
  const [state, formAction] = useFormState(tambahTindakLanjutAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="rapat_id" value={rapatId} />

      <div className="min-w-[200px] flex-1 space-y-1">
        <label className="text-xs font-bold text-ink/60">Uraian tindak lanjut</label>
        <input name="uraian" required className={`${inputCls} w-full`} />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-ink/60">Penanggung jawab</label>
        <select name="penanggung_jawab_id" defaultValue="" className={inputCls}>
          <option value="">— Belum ditunjuk —</option>
          {daftarPegawai.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama_lengkap}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-ink/60">Batas waktu</label>
        <input name="batas_waktu" type="date" className={inputCls} />
      </div>

      <TombolTambahKecil />

      {state?.pesan && !state.sukses && (
        <p className="w-full text-xs text-clay-700">{state.pesan}</p>
      )}
    </form>
  );
}
