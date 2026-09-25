"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahKegiatanAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

export const LABEL_JENIS: Record<string, string> = {
  ruk: "RUK (Rencana Usulan Kegiatan)",
  rpk: "RPK (Rencana Pelaksanaan Kegiatan)",
};

export const LABEL_UPAYA: Record<string, string> = {
  ukm_esensial: "UKM Esensial",
  ukm_pengembangan: "UKM Pengembangan",
  ukp: "UKP",
  manajemen: "Manajemen",
  mutu: "Mutu",
};

export const LABEL_SUMBER_DANA: Record<string, string> = {
  bok: "BOK",
  jkn: "JKN",
  apbd: "APBD",
  lainnya: "Lainnya",
};

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Catat Kegiatan"}
    </button>
  );
}

export default function FormTambahKegiatan() {
  const [state, formAction] = useFormState(tambahKegiatanAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-1.5">
        <label htmlFor="tahun" className={labelCls}>
          Tahun
        </label>
        <input
          id="tahun"
          name="tahun"
          type="number"
          required
          defaultValue={new Date().getFullYear()}
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="jenis" className={labelCls}>
          Jenis
        </label>
        <select id="jenis" name="jenis" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            Pilih jenis...
          </option>
          {Object.entries(LABEL_JENIS).map(([nilai, label]) => (
            <option key={nilai} value={nilai}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="upaya" className={labelCls}>
          Upaya kesehatan
        </label>
        <select id="upaya" name="upaya" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            Pilih upaya...
          </option>
          {Object.entries(LABEL_UPAYA).map(([nilai, label]) => (
            <option key={nilai} value={nilai}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="program" className={labelCls}>
          Program
        </label>
        <input id="program" name="program" required className={inputCls} />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="kegiatan" className={labelCls}>
          Uraian kegiatan
        </label>
        <textarea id="kegiatan" name="kegiatan" required rows={2} className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="sasaran" className={labelCls}>
          Sasaran
        </label>
        <input id="sasaran" name="sasaran" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="volume" className={labelCls}>
          Target/volume
        </label>
        <input id="volume" name="volume" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="jadwal_bulan" className={labelCls}>
          Jadwal bulan (RPK)
        </label>
        <select id="jadwal_bulan" name="jadwal_bulan" defaultValue="" className={inputCls}>
          <option value="">— Belum ditentukan —</option>
          {BULAN.map((nama, i) => (
            <option key={nama} value={i + 1}>
              {nama}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="sumber_dana" className={labelCls}>
          Sumber dana
        </label>
        <select id="sumber_dana" name="sumber_dana" defaultValue="bok" className={inputCls}>
          {Object.entries(LABEL_SUMBER_DANA).map(([nilai, label]) => (
            <option key={nilai} value={nilai}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="rencana_anggaran" className={labelCls}>
          Rencana anggaran (Rp)
        </label>
        <input id="rencana_anggaran" name="rencana_anggaran" type="number" step="0.01" className={inputCls} />
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
