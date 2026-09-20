"use client";

import { useFormState, useFormStatus } from "react-dom";
import { simpanCatatanKlinisAction } from "./actions";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Catatan"}
    </button>
  );
}

export default function FormCatatanKlinis({
  kunjunganId,
  diagnosis,
  catatanKlinis,
  tindakan,
}: {
  kunjunganId: string;
  diagnosis: string;
  catatanKlinis: string;
  tindakan: string;
}) {
  const [state, formAction] = useFormState(simpanCatatanKlinisAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="kunjungan_id" value={kunjunganId} />

      <div className="space-y-1.5">
        <label htmlFor="diagnosis" className="text-sm font-bold text-ink/80">
          Diagnosis
        </label>
        <input
          id="diagnosis"
          name="diagnosis"
          defaultValue={diagnosis}
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="catatan_klinis" className="text-sm font-bold text-ink/80">
          Catatan klinis
        </label>
        <textarea
          id="catatan_klinis"
          name="catatan_klinis"
          rows={5}
          defaultValue={catatanKlinis}
          placeholder="Hasil pemeriksaan, temuan klinis, dst..."
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="tindakan" className="text-sm font-bold text-ink/80">
          Terapi / rencana
        </label>
        <input
          id="tindakan"
          name="tindakan"
          defaultValue={tindakan}
          placeholder="contoh: Pemberian resep, edukasi, rujuk lab"
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>

      {state?.pesan && (
        <p
          role="alert"
          className={`rounded-sm px-3.5 py-2.5 text-sm ${
            state.sukses ? "bg-teal-500/10 text-teal-700" : "bg-clay-600/10 text-clay-700"
          }`}
        >
          {state.pesan}
        </p>
      )}

      <TombolSimpan />
    </form>
  );
}
