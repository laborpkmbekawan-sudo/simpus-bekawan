"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahTarifAction } from "./actions";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Tambah Tarif"}
    </button>
  );
}

export default function FormTambahTarif({
  daftarKlaster,
}: {
  daftarKlaster: { id: string; nama: string }[];
}) {
  const [state, formAction] = useFormState(tambahTarifAction, null);
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
      <div className="min-w-[220px] flex-1 space-y-1.5">
        <label htmlFor="nama_layanan" className="text-sm font-bold text-ink/80">
          Nama layanan
        </label>
        <input
          id="nama_layanan"
          name="nama_layanan"
          required
          placeholder="contoh: Konsultasi Umum"
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>
      <div className="w-40 space-y-1.5">
        <label htmlFor="harga" className="text-sm font-bold text-ink/80">
          Harga (Rp)
        </label>
        <input
          id="harga"
          name="harga"
          type="number"
          required
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>
      <div className="w-44 space-y-1.5">
        <label htmlFor="kategori" className="text-sm font-bold text-ink/80">
          Kategori
        </label>
        <input
          id="kategori"
          name="kategori"
          defaultValue="Umum"
          placeholder="contoh: Laboratorium"
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>
      <div className="w-56 space-y-1.5">
        <label htmlFor="klaster_terkait_id" className="text-sm font-bold text-ink/80">
          Klaster terkait <span className="font-normal text-ink/40">(opsional)</span>
        </label>
        <select
          id="klaster_terkait_id"
          name="klaster_terkait_id"
          defaultValue=""
          className="w-full rounded-sm border border-sand-100 bg-white px-3 py-2.5 text-sm"
        >
          <option value="">Semua klaster</option>
          {daftarKlaster.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </select>
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
