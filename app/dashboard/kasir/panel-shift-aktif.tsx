"use client";

import { useState } from "react";
import { tutupShiftAction } from "./actions";

function formatRupiah(angka: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    angka
  );
}

export default function PanelShiftAktif({
  shiftId,
  modalAwal,
  dibukaPada,
  totalTunai,
  jumlahTransaksi,
}: {
  shiftId: string;
  modalAwal: number;
  dibukaPada: string;
  totalTunai: number;
  jumlahTransaksi: number;
}) {
  const [formTutupTerbuka, setFormTutupTerbuka] = useState(false);
  const estimasiKasAkhir = modalAwal + totalTunai;

  return (
    <div className="rounded-card border border-sand-100 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink/40">Shift Aktif</p>
          <p className="text-sm text-ink/60">
            Dibuka {new Date(dibukaPada).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <button
          onClick={() => setFormTutupTerbuka((v) => !v)}
          className="rounded-sm border border-clay-600/30 px-3.5 py-2 text-xs font-semibold text-clay-700 hover:bg-clay-600/10"
        >
          Tutup Shift
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-sm bg-sand-50 p-3">
          <p className="text-xs text-ink/45">Modal awal</p>
          <p className="font-bold text-ink">{formatRupiah(modalAwal)}</p>
        </div>
        <div className="rounded-sm bg-sand-50 p-3">
          <p className="text-xs text-ink/45">Transaksi tunai ({jumlahTransaksi})</p>
          <p className="font-bold text-ink">{formatRupiah(totalTunai)}</p>
        </div>
        <div className="rounded-sm bg-teal-500/10 p-3">
          <p className="text-xs text-ink/45">Estimasi kas akhir</p>
          <p className="font-bold text-teal-700">{formatRupiah(estimasiKasAkhir)}</p>
        </div>
      </div>

      {formTutupTerbuka && (
        <form action={tutupShiftAction} className="mt-5 space-y-3 border-t border-sand-100 pt-4">
          <input type="hidden" name="shift_id" value={shiftId} />
          <div className="max-w-xs space-y-1.5">
            <label htmlFor="kas_akhir" className="text-sm font-bold text-ink/80">
              Kas akhir dihitung fisik (Rp)
            </label>
            <input
              id="kas_akhir"
              name="kas_akhir"
              type="number"
              defaultValue={estimasiKasAkhir}
              className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-sm bg-clay-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-clay-700"
          >
            Konfirmasi Tutup Shift
          </button>
        </form>
      )}
    </div>
  );
}
