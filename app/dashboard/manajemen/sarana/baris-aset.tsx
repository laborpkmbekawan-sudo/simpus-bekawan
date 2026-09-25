"use client";

import { useFormState, useFormStatus } from "react-dom";
import { perbaruiAsetAction } from "./actions";
import { LABEL_KATEGORI } from "./form-tambah";

const inputCls = "rounded-sm border border-sand-100 bg-[#FBFDFF] px-2.5 py-1.5 text-xs";

function TombolSimpanKecil() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "..." : "Simpan"}
    </button>
  );
}

export type AsetBaris = {
  id: string;
  nama_aset: string;
  kategori: string;
  lokasi_id: string | null;
  kondisi: string;
  tanggal_pemeriksaan: string | null;
  tindak_lanjut: string | null;
  status_perbaikan: string;
};

const WARNA_KONDISI: Record<string, string> = {
  baik: "bg-teal-500/10 text-teal-700",
  rusak_ringan: "bg-amber-500/10 text-amber-700",
  rusak_berat: "bg-clay-600/10 text-clay-700",
};

const LABEL_KONDISI: Record<string, string> = {
  baik: "Baik",
  rusak_ringan: "Rusak Ringan",
  rusak_berat: "Rusak Berat",
};

const LABEL_STATUS_PERBAIKAN: Record<string, string> = {
  tidak_perlu: "Tidak Perlu",
  menunggu: "Menunggu",
  proses: "Proses",
  selesai: "Selesai",
};

export default function BarisAset({ aset, namaLokasi }: { aset: AsetBaris; namaLokasi: string }) {
  const [state, formAction] = useFormState(perbaruiAsetAction, null);

  return (
    <div className="rounded-sm border border-sand-100 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-ink/50">
            {LABEL_KATEGORI[aset.kategori] ?? aset.kategori} · {namaLokasi}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-ink">{aset.nama_aset}</p>
          {aset.tanggal_pemeriksaan && (
            <p className="mt-1 text-xs text-ink/50">Diperiksa: {aset.tanggal_pemeriksaan}</p>
          )}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${WARNA_KONDISI[aset.kondisi]}`}>
          {LABEL_KONDISI[aset.kondisi]}
        </span>
      </div>

      <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-sand-100 pt-3">
        <input type="hidden" name="id" value={aset.id} />

        <div className="space-y-1">
          <label className="text-xs font-bold text-ink/60">Kondisi</label>
          <select name="kondisi" defaultValue={aset.kondisi} className={inputCls}>
            <option value="baik">Baik</option>
            <option value="rusak_ringan">Rusak Ringan</option>
            <option value="rusak_berat">Rusak Berat</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-ink/60">Status perbaikan</label>
          <select name="status_perbaikan" defaultValue={aset.status_perbaikan} className={inputCls}>
            {Object.entries(LABEL_STATUS_PERBAIKAN).map(([nilai, label]) => (
              <option key={nilai} value={nilai}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[180px] flex-1 space-y-1">
          <label className="text-xs font-bold text-ink/60">Tindak lanjut</label>
          <input
            name="tindak_lanjut"
            defaultValue={aset.tindak_lanjut ?? ""}
            className={`${inputCls} w-full`}
          />
        </div>

        <TombolSimpanKecil />
      </form>

      {state?.pesan && (
        <p
          role="alert"
          className={`mt-2 rounded-sm px-3 py-2 text-xs ${
            state.sukses ? "bg-teal-500/10 text-teal-700" : "bg-clay-600/10 text-clay-700"
          }`}
        >
          {state.pesan}
        </p>
      )}
    </div>
  );
}
