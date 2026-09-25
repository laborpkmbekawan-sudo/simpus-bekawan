"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahKegiatanUkmAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

export const LABEL_UPAYA: Record<string, string> = {
  promkes: "Promosi Kesehatan",
  kesling: "Kesehatan Lingkungan",
  gizi_masyarakat: "Gizi Masyarakat",
  p2p: "P2P (Pencegahan & Pengendalian Penyakit)",
  perkesmas: "Perkesmas",
  kesorga: "Kesehatan Olahraga",
  kesja: "Kesehatan Kerja",
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
      {pending ? "Menyimpan..." : "Catat Kegiatan"}
    </button>
  );
}

export default function FormTambahKegiatanUkm({ daftarPegawai }: { daftarPegawai: { id: string; nama_lengkap: string }[] }) {
  const [state, formAction] = useFormState(tambahKegiatanUkmAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-1.5">
        <label htmlFor="tanggal_ukm" className={labelCls}>
          Tanggal
        </label>
        <input
          id="tanggal_ukm"
          name="tanggal"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="upaya" className={labelCls}>
          Upaya
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

      <div className="space-y-1.5">
        <label htmlFor="jenis_kegiatan" className={labelCls}>
          Jenis kegiatan
        </label>
        <input id="jenis_kegiatan" name="jenis_kegiatan" required placeholder="mis. Posyandu Lansia" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="desa_wilayah" className={labelCls}>
          Desa/wilayah
        </label>
        <input id="desa_wilayah" name="desa_wilayah" required className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="sasaran" className={labelCls}>
          Sasaran
        </label>
        <input id="sasaran" name="sasaran" type="number" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="capaian" className={labelCls}>
          Capaian
        </label>
        <input id="capaian" name="capaian" type="number" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="petugas_pelaksana_id" className={labelCls}>
          Petugas pelaksana
        </label>
        <select id="petugas_pelaksana_id" name="petugas_pelaksana_id" defaultValue="" className={inputCls}>
          <option value="">— Belum ditunjuk —</option>
          {daftarPegawai.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama_lengkap}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="hasil" className={labelCls}>
          Hasil
        </label>
        <textarea id="hasil" name="hasil" rows={2} className={inputCls} />
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
