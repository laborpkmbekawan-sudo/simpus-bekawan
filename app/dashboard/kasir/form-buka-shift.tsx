"use client";

import { useFormState, useFormStatus } from "react-dom";
import { bukaShiftAction } from "./actions";

function TombolBuka() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Membuka..." : "Buka Shift"}
    </button>
  );
}

export default function FormBukaShift() {
  const [state, formAction] = useFormState(bukaShiftAction, null);

  return (
    <div className="rounded-card border border-sand-100 bg-white p-8 text-center">
      <p className="text-sm font-bold text-ink">Belum ada shift aktif</p>
      <p className="mt-1 text-sm text-ink/60">Buka shift dulu sebelum bisa proses pembayaran.</p>

      <form action={formAction} className="mx-auto mt-5 max-w-xs space-y-3 text-left">
        <div className="space-y-1.5">
          <label htmlFor="modal_awal" className="text-sm font-bold text-ink/80">
            Modal awal kas (Rp)
          </label>
          <input
            id="modal_awal"
            name="modal_awal"
            type="number"
            defaultValue={0}
            className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
          />
        </div>
        {state?.pesan && (
          <p role="alert" className="rounded-sm bg-clay-600/10 px-3.5 py-2.5 text-sm text-clay-700">
            {state.pesan}
          </p>
        )}
        <div className="text-center">
          <TombolBuka />
        </div>
      </form>
    </div>
  );
}
