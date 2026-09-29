"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { simpanSurveiAction } from "./actions";

const PILIHAN_NILAI = [
  { nilai: "sangat_puas", label: "Sangat puas" },
  { nilai: "puas", label: "Puas" },
  { nilai: "cukup", label: "Cukup" },
  { nilai: "kurang_puas", label: "Kurang puas" },
];

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-sm bg-teal-700 px-5 py-3 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Kirim Survei"}
    </button>
  );
}

export default function FormSurvei({ klaster }: { klaster: { id: string; nama: string }[] }) {
  const [state, formAction] = useFormState(simpanSurveiAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  if (state?.sukses) {
    return (
      <div className="space-y-3 rounded-card border border-teal-700/25 bg-teal-500/10 p-6 text-center">
        <p className="text-3xl">✓</p>
        <p className="text-base font-bold text-ink">Terima kasih!</p>
        <p className="text-sm text-ink/60">{state.pesan}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 text-sm font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
        >
          Isi survei lagi
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="klaster_id" className="text-sm font-bold text-ink/80">Unit yang dikunjungi (opsional)</label>
        <select id="klaster_id" name="klaster_id" defaultValue="" className={inputCls}>
          <option value="">— Tidak disebutkan —</option>
          {klaster.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="nama_pasien" className="text-sm font-bold text-ink/80">Nama (opsional)</label>
          <input id="nama_pasien" name="nama_pasien" maxLength={200} className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="no_rm" className="text-sm font-bold text-ink/80">No. RM (opsional)</label>
          <input id="no_rm" name="no_rm" maxLength={30} className={inputCls} />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-bold text-ink/80">Bagaimana penilaian kamu terhadap pelayanan hari ini?</legend>
        <div className="grid grid-cols-2 gap-2.5">
          {PILIHAN_NILAI.map((p, i) => (
            <label
              key={p.nilai}
              className="flex cursor-pointer items-center gap-2.5 rounded-sm border border-sand-100 bg-white px-3.5 py-3 text-sm has-[:checked]:border-teal-700 has-[:checked]:bg-teal-500/10"
            >
              <input
                type="radio"
                name="nilai"
                value={p.nilai}
                required
                defaultChecked={i === 0}
                className="h-4 w-4 accent-teal-700"
              />
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="saran" className="text-sm font-bold text-ink/80">Saran / masukan (opsional)</label>
        <textarea
          id="saran"
          name="saran"
          rows={4}
          maxLength={2000}
          placeholder="Tuliskan saran, keluhan, atau pujian untuk pelayanan kami"
          className={inputCls}
        />
      </div>

      {state?.pesan && !state.sukses && (
        <p role="alert" className="rounded-sm bg-clay-600/10 px-3.5 py-2.5 text-sm text-clay-700">
          {state.pesan}
        </p>
      )}

      <TombolSimpan />
    </form>
  );
}
