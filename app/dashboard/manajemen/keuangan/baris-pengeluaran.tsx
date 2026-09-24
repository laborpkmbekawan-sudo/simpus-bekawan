"use client";

import { rupiah } from "@/lib/format";
import { putuskanPengeluaranAction } from "./actions";

export type PengeluaranBaris = {
  id: string;
  tanggal: string;
  kategori: string;
  jumlah: number;
  keterangan: string | null;
  status: "diajukan" | "disetujui" | "ditolak";
  diajukan_oleh_pegawai: { nama_lengkap: string } | null;
};

const WARNA_STATUS: Record<string, string> = {
  diajukan: "bg-amber-500/10 text-amber-700",
  disetujui: "bg-teal-500/10 text-teal-700",
  ditolak: "bg-clay-600/10 text-clay-700",
};

const LABEL_STATUS: Record<string, string> = {
  diajukan: "Menunggu persetujuan",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

export default function BarisPengeluaran({
  pengeluaran,
  bisaSetujui,
}: {
  pengeluaran: PengeluaranBaris;
  bisaSetujui: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-sand-100 bg-white p-3">
      <div>
        <p className="text-sm font-semibold text-ink">
          {pengeluaran.kategori} <span className="font-normal text-ink/50">— {rupiah(pengeluaran.jumlah)}</span>
        </p>
        <p className="text-xs text-ink/50">
          {pengeluaran.tanggal} · Diajukan: {pengeluaran.diajukan_oleh_pegawai?.nama_lengkap ?? "—"}
          {pengeluaran.keterangan ? ` · ${pengeluaran.keterangan}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${WARNA_STATUS[pengeluaran.status]}`}>
          {LABEL_STATUS[pengeluaran.status]}
        </span>
        {bisaSetujui && pengeluaran.status === "diajukan" && (
          <>
            <button
              onClick={() => putuskanPengeluaranAction(pengeluaran.id, true)}
              className="rounded-sm bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-900"
            >
              Setujui
            </button>
            <button
              onClick={() => putuskanPengeluaranAction(pengeluaran.id, false)}
              className="rounded-sm bg-clay-600/10 px-3 py-1.5 text-xs font-semibold text-clay-700 hover:bg-clay-600/20"
            >
              Tolak
            </button>
          </>
        )}
      </div>
    </div>
  );
}
