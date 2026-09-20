"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ubahStatusKunjunganAction } from "./actions";

const LABEL_TRIASE: Record<string, string> = { hijau: "Hijau", kuning: "Kuning", merah: "Merah" };
const WARNA_TRIASE: Record<string, string> = {
  hijau: "bg-teal-700/10 text-teal-700",
  kuning: "bg-clay-600/10 text-clay-700",
  merah: "bg-red-500/10 text-red-600",
};

type KartuProps = {
  id: string;
  nomorTampil: string;
  namaPasien: string;
  noRm: string;
  jenisKunjungan: string;
  status: string;
  triase: string | null;
  bisaPanggil: boolean;
  bisaLayani: boolean;
};

export default function KartuAntrian({
  id,
  nomorTampil,
  namaPasien,
  noRm,
  jenisKunjungan,
  status,
  triase,
  bisaPanggil,
  bisaLayani,
}: KartuProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function lanjutkanStatus() {
    const berikutnya = status === "menunggu" ? "dipanggil" : "selesai";
    setPending(true);
    await ubahStatusKunjunganAction(id, berikutnya);
    setPending(false);
    // Tenaga klinis: habis Panggil langsung masuk halaman Pelayanan.
    if (berikutnya === "dipanggil" && bisaLayani) {
      router.push(`/dashboard/pelayanan/${id}`);
    }
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-sm border px-4 py-3 ${
        status === "selesai"
          ? "border-sand-100 bg-sand-50 opacity-60"
          : status === "dipanggil"
          ? "border-teal-700/30 bg-teal-500/10"
          : "border-sand-100 bg-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-ink/5 text-sm font-bold text-ink">
          {nomorTampil}
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{namaPasien}</p>
          <p className="text-xs text-ink/50">
            No. RM {noRm} · {jenisKunjungan}
            {triase && (
              <span className={`ml-2 rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${WARNA_TRIASE[triase]}`}>
                {LABEL_TRIASE[triase]}
              </span>
            )}
          </p>
        </div>
      </div>

      {status === "selesai" ? (
        <span className="text-xs font-medium text-ink/40">Selesai</span>
      ) : !bisaPanggil ? (
        <span className="text-xs font-medium capitalize text-ink/40">{status}</span>
      ) : status === "dipanggil" && bisaLayani ? (
        <Link
          href={`/dashboard/pelayanan/${id}`}
          className="whitespace-nowrap rounded-sm bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-900"
        >
          Layani
        </Link>
      ) : (
        <button
          onClick={lanjutkanStatus}
          disabled={pending}
          className="whitespace-nowrap rounded-sm bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white
                     hover:bg-teal-900 disabled:opacity-50"
        >
          {status === "menunggu" ? "Panggil" : "Selesaikan"}
        </button>
      )}
    </div>
  );
}
