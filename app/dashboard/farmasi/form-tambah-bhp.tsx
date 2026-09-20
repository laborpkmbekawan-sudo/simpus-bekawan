"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahBhpAction } from "./actions";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Tambah BHP"}
    </button>
  );
}

export default function FormTambahBhp() {
  const [state, formAction] = useFormState(tambahBhpAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && state.pesan === "") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-card border border-sand-100 bg-white p-5"
    >
      <div className="min-w-[200px] flex-1 space-y-1.5">
        <label htmlFor="nama_bhp" className="text-sm font-bold text-ink/80">
          Nama BHP
        </label>
        <input
          id="nama_bhp"
          name="nama_bhp"
          required
          placeholder="contoh: Kasa Steril"
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>
      <div className="w-28 space-y-1.5">
        <label htmlFor="satuan" className="text-sm font-bold text-ink/80">
          Satuan
        </label>
        <input
          id="satuan"
          name="satuan"
          defaultValue="pcs"
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>
      <div className="w-32 space-y-1.5">
        <label htmlFor="stok_awal" className="text-sm font-bold text-ink/80">
          Stok awal
        </label>
        <input
          id="stok_awal"
          name="stok_awal"
          type="number"
          step="0.1"
          defaultValue={0}
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>
      <div className="w-32 space-y-1.5">
        <label htmlFor="stok_minimum" className="text-sm font-bold text-ink/80">
          Stok minimum
        </label>
        <input
          id="stok_minimum"
          name="stok_minimum"
          type="number"
          step="0.1"
          defaultValue={0}
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>
      <TombolSimpan />
      {state?.pesan && (
        <p role="alert" className="w-full rounded-sm bg-clay-600/10 px-3.5 py-2.5 text-sm text-clay-700">
          {state.pesan}
        </p>
      )}
    </form>
  );
}
