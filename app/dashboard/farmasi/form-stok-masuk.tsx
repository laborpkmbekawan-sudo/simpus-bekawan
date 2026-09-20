"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahStokMasukAction } from "./actions";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-4 py-2 text-xs font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan"}
    </button>
  );
}

export default function FormStokMasuk({ bhpId, namaBhp }: { bhpId: string; namaBhp: string }) {
  const [state, formAction] = useFormState(tambahStokMasukAction, null);
  const [terbuka, setTerbuka] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && state.pesan === "") {
      formRef.current?.reset();
      setTerbuka(false);
    }
  }, [state]);

  if (!terbuka) {
    return (
      <button
        onClick={() => setTerbuka(true)}
        className="text-xs font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
      >
        + Stok masuk
      </button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="bhp_id" value={bhpId} />
      <input
        name="jumlah"
        type="number"
        step="0.1"
        placeholder="Jumlah"
        autoFocus
        className="w-20 rounded-sm border border-sand-100 bg-white px-2 py-1.5 text-xs"
      />
      <input
        name="keterangan"
        placeholder={`Keterangan (${namaBhp})`}
        className="w-32 rounded-sm border border-sand-100 bg-white px-2 py-1.5 text-xs"
      />
      <TombolSimpan />
      <button
        type="button"
        onClick={() => setTerbuka(false)}
        className="text-xs text-ink/40 underline"
      >
        Batal
      </button>
      {state?.pesan && <span className="text-xs text-clay-700">{state.pesan}</span>}
    </form>
  );
}
