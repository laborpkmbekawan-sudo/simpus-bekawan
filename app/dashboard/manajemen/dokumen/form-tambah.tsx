"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahDokumenOrganisasiAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

export const LABEL_JENIS_DOKUMEN: Record<string, string> = {
  kebijakan: "Kebijakan",
  pedoman: "Pedoman",
  panduan: "Panduan",
  sop: "SOP",
  instruksi_kerja: "Instruksi Kerja",
  kak: "KAK",
  formulir: "Formulir",
  sk: "SK",
  dokumen_mutu: "Dokumen Mutu",
  bukti_pelaksanaan: "Bukti Pelaksanaan",
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
      {pending ? "Menyimpan..." : "Tambah Dokumen"}
    </button>
  );
}

export default function FormTambahDokumenOrganisasi() {
  const [state, formAction] = useFormState(tambahDokumenOrganisasiAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-1.5">
        <label htmlFor="jenis" className={labelCls}>
          Jenis dokumen
        </label>
        <select id="jenis" name="jenis" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            Pilih jenis...
          </option>
          {Object.entries(LABEL_JENIS_DOKUMEN).map(([nilai, label]) => (
            <option key={nilai} value={nilai}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor="judul" className={labelCls}>
          Judul dokumen
        </label>
        <input id="judul" name="judul" required className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="nomor" className={labelCls}>
          Nomor
        </label>
        <input id="nomor" name="nomor" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="tanggal_terbit" className={labelCls}>
          Tanggal terbit
        </label>
        <input id="tanggal_terbit" name="tanggal_terbit" type="date" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="tanggal_kedaluwarsa" className={labelCls}>
          Tanggal kedaluwarsa/review
        </label>
        <input id="tanggal_kedaluwarsa" name="tanggal_kedaluwarsa" type="date" className={inputCls} />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="catatan" className={labelCls}>
          Catatan
        </label>
        <input id="catatan" name="catatan" className={inputCls} />
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
