"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahAsetAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

export const LABEL_KATEGORI: Record<string, string> = {
  bangunan: "Bangunan",
  alat_kesehatan: "Alat Kesehatan",
  kendaraan: "Kendaraan",
  utilitas: "Utilitas (listrik/air)",
  it_dan_komunikasi: "IT & Komunikasi",
  lainnya: "Lainnya",
};

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Catat Aset"}
    </button>
  );
}

export type LokasiOpsi = { id: string; nama: string };

export default function FormTambahAset({ daftarLokasi }: { daftarLokasi: LokasiOpsi[] }) {
  const [state, formAction] = useFormState(tambahAsetAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-1.5">
        <label htmlFor="nama_aset" className={labelCls}>
          Nama aset
        </label>
        <input id="nama_aset" name="nama_aset" required className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="kategori" className={labelCls}>
          Kategori
        </label>
        <select id="kategori" name="kategori" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            Pilih kategori...
          </option>
          {Object.entries(LABEL_KATEGORI).map(([nilai, label]) => (
            <option key={nilai} value={nilai}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="lokasi_id" className={labelCls}>
          Lokasi
        </label>
        <select id="lokasi_id" name="lokasi_id" defaultValue="" className={inputCls}>
          <option value="">— Tidak ditentukan —</option>
          {daftarLokasi.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nama}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="kondisi" className={labelCls}>
          Kondisi
        </label>
        <select id="kondisi" name="kondisi" defaultValue="baik" className={inputCls}>
          <option value="baik">Baik</option>
          <option value="rusak_ringan">Rusak Ringan</option>
          <option value="rusak_berat">Rusak Berat</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="tanggal_pemeriksaan" className={labelCls}>
          Tanggal pemeriksaan
        </label>
        <input
          id="tanggal_pemeriksaan"
          name="tanggal_pemeriksaan"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className={inputCls}
        />
      </div>

      <div className="sm:col-span-3">
        {state?.pesan && (
          <p
            role="alert"
            className={`mb-3 rounded-sm px-3.5 py-2.5 text-sm ${
              state.sukses ? "bg-teal-500/10 text-teal-700" : "bg-clay-600/10 text-clay-700"
            }`}
          >
            {state.pesan}
          </p>
        )}
        <TombolSimpan />
      </div>
    </form>
  );
}
