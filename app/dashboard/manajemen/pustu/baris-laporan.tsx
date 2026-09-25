"use client";

import { useFormState, useFormStatus } from "react-dom";
import { perbaruiLaporanPustuAction } from "./actions";
import { LABEL_STATUS_LOGISTIK } from "./form-laporan";

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

export type LaporanBaris = {
  id: string;
  lokasi_id: string;
  bulan: string;
  jumlah_kunjungan: number | null;
  jumlah_rujukan: number | null;
  status_logistik: string;
  kendala: string | null;
  tindak_lanjut: string | null;
  status: string;
};

const WARNA_LOGISTIK: Record<string, string> = {
  aman: "bg-teal-500/10 text-teal-700",
  menipis: "bg-amber-500/10 text-amber-700",
  kosong: "bg-clay-600/10 text-clay-700",
};

const WARNA_STATUS: Record<string, string> = {
  terbuka: "bg-amber-500/10 text-amber-700",
  selesai: "bg-teal-500/10 text-teal-700",
};

export default function BarisLaporan({
  laporan,
  namaLokasi,
}: {
  laporan: LaporanBaris;
  namaLokasi: string;
}) {
  const [state, formAction] = useFormState(perbaruiLaporanPustuAction, null);
  const bulanLabel = new Date(`${laporan.bulan}T00:00:00Z`).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="rounded-sm border border-sand-100 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-ink/50">
            {namaLokasi} · {bulanLabel}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-ink">
            Kunjungan: {laporan.jumlah_kunjungan ?? "—"} · Rujukan: {laporan.jumlah_rujukan ?? "—"}
          </p>
          {laporan.kendala && <p className="mt-1 text-xs text-ink/50">Kendala: {laporan.kendala}</p>}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${WARNA_LOGISTIK[laporan.status_logistik]}`}>
            Logistik: {LABEL_STATUS_LOGISTIK[laporan.status_logistik]}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${WARNA_STATUS[laporan.status]}`}>
            {laporan.status === "selesai" ? "Selesai" : "Terbuka"}
          </span>
        </div>
      </div>

      <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-sand-100 pt-3">
        <input type="hidden" name="id" value={laporan.id} />

        <div className="min-w-[220px] flex-1 space-y-1">
          <label className="text-xs font-bold text-ink/60">Tindak lanjut</label>
          <input
            name="tindak_lanjut"
            defaultValue={laporan.tindak_lanjut ?? ""}
            className={`${inputCls} w-full`}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-ink/60">Status</label>
          <select name="status" defaultValue={laporan.status} className={inputCls}>
            <option value="terbuka">Terbuka</option>
            <option value="selesai">Selesai</option>
          </select>
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
