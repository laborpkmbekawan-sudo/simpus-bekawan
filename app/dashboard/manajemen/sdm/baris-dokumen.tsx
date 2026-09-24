"use client";

import { hapusDokumenAction } from "./actions";
import { LABEL_JENIS } from "./form-tambah-dokumen";

export type DokumenBaris = {
  id: string;
  jenis: string;
  nomor: string | null;
  nama_dokumen: string | null;
  tanggal_kedaluwarsa: string | null;
  pegawai: { nama_lengkap: string } | null;
};

export default function BarisDokumen({ dokumen, sisaHari }: { dokumen: DokumenBaris; sisaHari: number | null }) {
  let warna = "bg-sand-50 text-ink/60";
  let label = "";
  if (sisaHari !== null) {
    if (sisaHari < 0) {
      warna = "bg-clay-600/10 text-clay-700";
      label = "Sudah kedaluwarsa";
    } else if (sisaHari <= 60) {
      warna = "bg-amber-500/10 text-amber-700";
      label = `${sisaHari} hari lagi`;
    } else {
      warna = "bg-teal-500/10 text-teal-700";
      label = `${sisaHari} hari lagi`;
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-sand-100 bg-white p-3">
      <div>
        <p className="text-sm font-semibold text-ink">
          {dokumen.pegawai?.nama_lengkap ?? "—"} <span className="font-normal text-ink/50">— {LABEL_JENIS[dokumen.jenis] ?? dokumen.jenis}</span>
        </p>
        <p className="text-xs text-ink/50">
          {[dokumen.nama_dokumen, dokumen.nomor ? `No. ${dokumen.nomor}` : null, dokumen.tanggal_kedaluwarsa ? `Kedaluwarsa ${dokumen.tanggal_kedaluwarsa}` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {label && <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${warna}`}>{label}</span>}
        <button
          onClick={() => hapusDokumenAction(dokumen.id)}
          className="text-xs font-medium text-clay-700 underline decoration-clay-700/30 underline-offset-2"
        >
          Hapus
        </button>
      </div>
    </div>
  );
}
