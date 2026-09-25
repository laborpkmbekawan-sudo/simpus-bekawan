"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahJejaringAction } from "./actions";
import type { LokasiOpsi } from "./form-laporan";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

export const LABEL_JENIS_JEJARING: Record<string, string> = {
  praktik_dokter: "Praktik Dokter Mandiri",
  praktik_bidan: "Praktik Bidan Mandiri",
  klinik_swasta: "Klinik Swasta",
  apotek: "Apotek",
  laboratorium: "Laboratorium",
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
      {pending ? "Menyimpan..." : "Daftarkan Jejaring"}
    </button>
  );
}

export default function FormJejaring({ daftarLokasi }: { daftarLokasi: LokasiOpsi[] }) {
  const [state, formAction] = useFormState(tambahJejaringAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-1.5">
        <label htmlFor="nama" className={labelCls}>
          Nama fasyankes
        </label>
        <input id="nama" name="nama" required className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="jenis" className={labelCls}>
          Jenis
        </label>
        <select id="jenis" name="jenis" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            Pilih jenis...
          </option>
          {Object.entries(LABEL_JENIS_JEJARING).map(([nilai, label]) => (
            <option key={nilai} value={nilai}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="lokasi_terdekat_id" className={labelCls}>
          Wilayah terdekat
        </label>
        <select id="lokasi_terdekat_id" name="lokasi_terdekat_id" defaultValue="" className={inputCls}>
          <option value="">— Tidak ditentukan —</option>
          {daftarLokasi.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nama}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="penanggung_jawab" className={labelCls}>
          Penanggung jawab
        </label>
        <input id="penanggung_jawab" name="penanggung_jawab" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="kontak" className={labelCls}>
          Kontak
        </label>
        <input id="kontak" name="kontak" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="alamat" className={labelCls}>
          Alamat
        </label>
        <input id="alamat" name="alamat" className={inputCls} />
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
