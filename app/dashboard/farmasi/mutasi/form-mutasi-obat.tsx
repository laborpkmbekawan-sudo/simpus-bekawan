"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { terimaStokObatAction } from "./actions";

type Obat = { id: string; nama_obat: string; satuan: string };

const SUMBER = ["Gudang Farmasi Dinkes", "Hibah/Donasi", "Pengembalian Pasien", "Lainnya"];

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Catat Penerimaan"}
    </button>
  );
}

export default function FormMutasiObat({ daftarObat }: { daftarObat: Obat[] }) {
  const [state, formAction] = useFormState(terimaStokObatAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-card border border-sand-100 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
        <label htmlFor="obat_id" className="text-sm font-bold text-ink/80">
          Obat
        </label>
        <select
          id="obat_id"
          name="obat_id"
          required
          defaultValue=""
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        >
          <option value="" disabled>
            Pilih obat...
          </option>
          {daftarObat.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nama_obat}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="jumlah" className="text-sm font-bold text-ink/80">
          Jumlah Diterima
        </label>
        <input
          id="jumlah"
          name="jumlah"
          type="number"
          step="0.1"
          min="0"
          required
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="sumber" className="text-sm font-bold text-ink/80">
          Sumber
        </label>
        <select
          id="sumber"
          name="sumber"
          defaultValue={SUMBER[0]}
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        >
          {SUMBER.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="no_batch" className="text-sm font-bold text-ink/80">
          No. Batch
        </label>
        <input
          id="no_batch"
          name="no_batch"
          placeholder="opsional"
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="tanggal_kadaluwarsa" className="text-sm font-bold text-ink/80">
          Tanggal Kadaluwarsa
        </label>
        <input
          id="tanggal_kadaluwarsa"
          name="tanggal_kadaluwarsa"
          type="date"
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
        <label htmlFor="keterangan" className="text-sm font-bold text-ink/80">
          Keterangan
        </label>
        <input
          id="keterangan"
          name="keterangan"
          placeholder="opsional, contoh: No. SBBK 123/2026"
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>

      <div className="sm:col-span-2 lg:col-span-3">
        <TombolSimpan />
        {state?.pesan && (
          <p
            role="alert"
            className={`mt-3 rounded-sm px-3.5 py-2.5 text-sm ${
              state.sukses ? "bg-teal-500/10 text-teal-700" : "bg-clay-600/10 text-clay-700"
            }`}
          >
            {state.pesan}
          </p>
        )}
      </div>
    </form>
  );
}
