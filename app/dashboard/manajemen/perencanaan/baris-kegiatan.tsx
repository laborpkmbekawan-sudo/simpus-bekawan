"use client";

import { useFormState, useFormStatus } from "react-dom";
import { perbaruiKegiatanAction } from "./actions";
import { LABEL_JENIS, LABEL_UPAYA, LABEL_SUMBER_DANA } from "./form-tambah";
import { rupiah } from "@/lib/format";

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

export type KegiatanBaris = {
  id: string;
  tahun: number;
  jenis: string;
  upaya: string;
  program: string;
  kegiatan: string;
  sasaran: string | null;
  volume: string | null;
  jadwal_bulan: number | null;
  sumber_dana: string;
  rencana_anggaran: number | null;
  realisasi_anggaran: number | null;
  penanggung_jawab_id: string | null;
  status: string;
  catatan: string | null;
};

const WARNA_STATUS: Record<string, string> = {
  diusulkan: "bg-sand-100 text-ink/60",
  disetujui: "bg-teal-500/10 text-teal-700",
  berjalan: "bg-amber-500/10 text-amber-700",
  selesai: "bg-teal-700/10 text-teal-800",
  ditunda: "bg-clay-600/10 text-clay-700",
};

const LABEL_STATUS: Record<string, string> = {
  diusulkan: "Diusulkan",
  disetujui: "Disetujui",
  berjalan: "Berjalan",
  selesai: "Selesai",
  ditunda: "Ditunda",
};

const BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export default function BarisKegiatan({
  kegiatan,
  daftarPegawai,
}: {
  kegiatan: KegiatanBaris;
  daftarPegawai: Pegawai[];
}) {
  const [state, formAction] = useFormState(perbaruiKegiatanAction, null);

  return (
    <div className="rounded-sm border border-sand-100 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-ink/50">
            {kegiatan.tahun} · {LABEL_JENIS[kegiatan.jenis] ?? kegiatan.jenis} · {LABEL_UPAYA[kegiatan.upaya] ?? kegiatan.upaya}
            {kegiatan.jadwal_bulan ? ` · ${BULAN[kegiatan.jadwal_bulan - 1]}` : ""}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-ink">{kegiatan.program}</p>
          <p className="mt-0.5 text-xs text-ink/60">{kegiatan.kegiatan}</p>
          {(kegiatan.sasaran || kegiatan.volume) && (
            <p className="mt-1 text-xs text-ink/50">
              {kegiatan.sasaran && <>Sasaran: {kegiatan.sasaran} </>}
              {kegiatan.volume && <>· Target: {kegiatan.volume}</>}
            </p>
          )}
          <p className="mt-1 text-xs text-ink/50">
            {LABEL_SUMBER_DANA[kegiatan.sumber_dana] ?? kegiatan.sumber_dana}
            {kegiatan.rencana_anggaran != null && <> · Rencana: {rupiah(kegiatan.rencana_anggaran)}</>}
            {kegiatan.realisasi_anggaran != null && <> · Realisasi: {rupiah(kegiatan.realisasi_anggaran)}</>}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${WARNA_STATUS[kegiatan.status]}`}>
          {LABEL_STATUS[kegiatan.status]}
        </span>
      </div>

      <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-sand-100 pt-3">
        <input type="hidden" name="id" value={kegiatan.id} />

        <div className="space-y-1">
          <label className="text-xs font-bold text-ink/60">Penanggung jawab</label>
          <select name="penanggung_jawab_id" defaultValue={kegiatan.penanggung_jawab_id ?? ""} className={inputCls}>
            <option value="">— Belum ditunjuk —</option>
            {daftarPegawai.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama_lengkap}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-ink/60">Status</label>
          <select name="status" defaultValue={kegiatan.status} className={inputCls}>
            {Object.entries(LABEL_STATUS).map(([nilai, label]) => (
              <option key={nilai} value={nilai}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-ink/60">Realisasi anggaran (Rp)</label>
          <input
            name="realisasi_anggaran"
            type="number"
            step="0.01"
            defaultValue={kegiatan.realisasi_anggaran ?? ""}
            className={`${inputCls} w-32`}
          />
        </div>

        <div className="min-w-[180px] flex-1 space-y-1">
          <label className="text-xs font-bold text-ink/60">Catatan</label>
          <input name="catatan" defaultValue={kegiatan.catatan ?? ""} className={`${inputCls} w-full`} />
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
