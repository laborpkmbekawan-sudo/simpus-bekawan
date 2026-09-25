"use client";

import { useFormState, useFormStatus } from "react-dom";
import { perbaruiKegiatanUkmAction } from "./actions";
import { LABEL_UPAYA } from "./form-tambah";

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

export type Pegawai = { id: string; nama_lengkap: string };

export type KegiatanUkmBaris = {
  id: string;
  tanggal: string;
  upaya: string;
  jenis_kegiatan: string;
  desa_wilayah: string;
  sasaran: number | null;
  capaian: number | null;
  petugas_pelaksana_id: string | null;
  hasil: string | null;
  tindak_lanjut: string | null;
  status: string;
};

const WARNA_STATUS: Record<string, string> = {
  terbuka: "bg-amber-500/10 text-amber-700",
  selesai: "bg-teal-500/10 text-teal-700",
};

const LABEL_STATUS: Record<string, string> = {
  terbuka: "Terbuka",
  selesai: "Selesai",
};

export default function BarisKegiatanUkm({
  kegiatan,
  daftarPegawai,
}: {
  kegiatan: KegiatanUkmBaris;
  daftarPegawai: Pegawai[];
}) {
  const [state, formAction] = useFormState(perbaruiKegiatanUkmAction, null);
  const petugas = daftarPegawai.find((p) => p.id === kegiatan.petugas_pelaksana_id);

  return (
    <div className="rounded-sm border border-sand-100 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-ink/50">
            {kegiatan.tanggal} · {LABEL_UPAYA[kegiatan.upaya] ?? kegiatan.upaya}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-ink">{kegiatan.jenis_kegiatan}</p>
          <p className="mt-0.5 text-xs text-ink/60">{kegiatan.desa_wilayah}</p>
          {(kegiatan.sasaran != null || kegiatan.capaian != null) && (
            <p className="mt-1 text-xs text-ink/50">
              Sasaran: {kegiatan.sasaran ?? "—"} · Capaian: {kegiatan.capaian ?? "—"}
            </p>
          )}
          {petugas && <p className="mt-1 text-xs text-ink/50">Petugas: {petugas.nama_lengkap}</p>}
          {kegiatan.hasil && <p className="mt-1 text-xs text-ink/50">Hasil: {kegiatan.hasil}</p>}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${WARNA_STATUS[kegiatan.status]}`}>
          {LABEL_STATUS[kegiatan.status]}
        </span>
      </div>

      <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-sand-100 pt-3">
        <input type="hidden" name="id" value={kegiatan.id} />

        <div className="space-y-1">
          <label className="text-xs font-bold text-ink/60">Capaian</label>
          <input name="capaian" type="number" defaultValue={kegiatan.capaian ?? ""} className={`${inputCls} w-20`} />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-ink/60">Status</label>
          <select name="status" defaultValue={kegiatan.status} className={inputCls}>
            <option value="terbuka">Terbuka</option>
            <option value="selesai">Selesai</option>
          </select>
        </div>

        <div className="min-w-[180px] flex-1 space-y-1">
          <label className="text-xs font-bold text-ink/60">Tindak lanjut</label>
          <input name="tindak_lanjut" defaultValue={kegiatan.tindak_lanjut ?? ""} className={`${inputCls} w-full`} />
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
