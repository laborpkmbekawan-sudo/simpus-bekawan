"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { importMassalTarifAction } from "./actions";

function TombolImpor() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Mengimpor..." : "Impor Sekarang"}
    </button>
  );
}

export default function FormImporTarif() {
  const [state, formAction] = useFormState(importMassalTarifAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [terbuka, setTerbuka] = useState(false);

  useEffect(() => {
    if (state?.pesan?.startsWith("Berhasil")) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="rounded-card border border-sand-100 bg-white p-5">
      <button
        onClick={() => setTerbuka((v) => !v)}
        className="text-sm font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
      >
        {terbuka ? "Tutup impor massal" : "Impor banyak tarif sekaligus"}
      </button>

      {terbuka && (
        <form ref={formRef} action={formAction} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="teks_impor" className="text-sm font-bold text-ink/80">
              Tempel data (satu baris satu layanan)
            </label>
            <p className="text-xs text-ink/50">
              Format tiap baris: <code>Nama Layanan;Harga;Kategori</code> — kategori boleh dikosongkan.
            </p>
            <textarea
              id="teks_impor"
              name="teks_impor"
              rows={6}
              placeholder={"Pemeriksaan Darah Lengkap;75000;Laboratorium\nPemeriksaan Gula Darah;25000;Laboratorium\nKonsultasi Gigi;30000;Gigi dan Mulut"}
              className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 font-mono text-xs"
            />
          </div>
          {state?.pesan && (
            <p
              role="alert"
              className={`rounded-sm px-3.5 py-2.5 text-sm ${
                state.pesan.startsWith("Berhasil") ? "bg-teal-500/10 text-teal-700" : "bg-clay-600/10 text-clay-700"
              }`}
            >
              {state.pesan}
            </p>
          )}
          <TombolImpor />
        </form>
      )}
    </div>
  );
}
