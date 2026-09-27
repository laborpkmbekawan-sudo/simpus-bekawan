"use client";

import { useState, useTransition } from "react";
import { batalkanResepFarmasiAction, serahkanResepAction, verifikasiResepAction } from "./actions";

type Item = { id: string; namaObat: string; satuan: string; jumlah: number; aturanPakai: string | null; stokCukup: boolean };
type Resep = {
  id: string;
  status: string;
  dicatatPada: string;
  namaPasien: string;
  noRm: string;
  items: Item[];
};

const LABEL_STATUS: Record<string, string> = {
  menunggu: "Menunggu Verifikasi",
  diverifikasi: "Siap Diserahkan",
};

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BarisResep({ resep }: { resep: Resep }) {
  const [pesan, setPesan] = useState<{ teks: string; sukses: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const semuaStokCukup = resep.items.every((i) => i.stokCukup);

  function jalankan(aksi: () => Promise<{ pesan: string; sukses: boolean }>) {
    startTransition(async () => {
      const hasil = await aksi();
      setPesan({ teks: hasil.pesan, sukses: hasil.sukses });
    });
  }

  return (
    <div className="rounded-card border border-sand-100 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink">{resep.namaPasien}</p>
          <p className="text-xs text-ink/50">
            No. RM {resep.noRm} · {formatTanggal(resep.dicatatPada)}
          </p>
        </div>
        <span
          className={`rounded-sm px-2 py-1 text-xs font-semibold ${
            resep.status === "menunggu" ? "bg-clay-600/10 text-clay-700" : "bg-blue-500/10 text-blue-700"
          }`}
        >
          {LABEL_STATUS[resep.status] ?? resep.status}
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
        {resep.items.map((i) => (
          <div key={i.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-ink">
              {i.namaObat} — {i.jumlah} {i.satuan}
              {i.aturanPakai ? <span className="text-ink/50"> · {i.aturanPakai}</span> : null}
            </span>
            {!i.stokCukup && (
              <span className="rounded-sm bg-clay-600/10 px-1.5 py-0.5 text-[10px] font-medium text-clay-700">
                Stok kurang
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {resep.status === "menunggu" && (
          <button
            disabled={pending}
            onClick={() => jalankan(() => verifikasiResepAction(resep.id))}
            className="rounded-sm bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-900 disabled:opacity-60"
          >
            Verifikasi
          </button>
        )}
        {resep.status === "diverifikasi" && (
          <button
            disabled={pending || !semuaStokCukup}
            onClick={() => jalankan(() => serahkanResepAction(resep.id))}
            title={!semuaStokCukup ? "Ada obat yang stoknya kurang" : undefined}
            className="rounded-sm bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Serahkan Obat
          </button>
        )}
        <button
          disabled={pending}
          onClick={() => jalankan(() => batalkanResepFarmasiAction(resep.id))}
          className="text-xs font-medium text-clay-700 underline decoration-clay-700/30 underline-offset-2 disabled:opacity-60"
        >
          Batalkan
        </button>
        {pesan && (
          <span className={`text-xs ${pesan.sukses ? "text-teal-700" : "text-clay-700"}`}>{pesan.teks}</span>
        )}
      </div>
    </div>
  );
}

export default function DaftarResep({ daftarResep }: { daftarResep: Resep[] }) {
  return (
    <div className="space-y-3">
      {daftarResep.map((r) => (
        <BarisResep key={r.id} resep={r} />
      ))}
      {daftarResep.length === 0 && (
        <p className="rounded-sm bg-sand-50 px-4 py-8 text-center text-sm text-ink/45">
          Gak ada resep yang menunggu diproses.
        </p>
      )}
    </div>
  );
}
