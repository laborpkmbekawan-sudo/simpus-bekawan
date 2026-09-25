"use client";

import { useFormState, useFormStatus } from "react-dom";
import { perbaruiStatusTindakLanjutAction } from "./actions";

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

export type TindakLanjutBaris = {
  id: string;
  uraian: string;
  batas_waktu: string | null;
  status: string;
  bukti_penyelesaian: string | null;
  penanggung_jawab: { nama_lengkap: string } | null;
};

const WARNA_STATUS: Record<string, string> = {
  belum: "bg-amber-500/10 text-amber-700",
  proses: "bg-ink/5 text-ink/60",
  selesai: "bg-teal-500/10 text-teal-700",
};

export default function BarisTindakLanjutRapat({ item }: { item: TindakLanjutBaris }) {
  const [state, formAction] = useFormState(perbaruiStatusTindakLanjutAction, null);

  return (
    <div className="rounded-sm border border-sand-100 bg-sand-50/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink">{item.uraian}</p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${WARNA_STATUS[item.status]}`}>
          {item.status}
        </span>
      </div>
      <p className="mt-1 text-xs text-ink/50">
        PJ: {item.penanggung_jawab?.nama_lengkap ?? "—"}
        {item.batas_waktu ? ` · Batas waktu: ${item.batas_waktu}` : ""}
      </p>

      <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2">
        <input type="hidden" name="id" value={item.id} />
        <div className="space-y-1">
          <label className="text-xs font-bold text-ink/60">Status</label>
          <select name="status" defaultValue={item.status} className={inputCls}>
            <option value="belum">Belum</option>
            <option value="proses">Proses</option>
            <option value="selesai">Selesai</option>
          </select>
        </div>
        <div className="min-w-[160px] flex-1 space-y-1">
          <label className="text-xs font-bold text-ink/60">Bukti penyelesaian</label>
          <input name="bukti_penyelesaian" defaultValue={item.bukti_penyelesaian ?? ""} className={`${inputCls} w-full`} />
        </div>
        <TombolSimpanKecil />
      </form>

      {state?.pesan && (
        <p className={`mt-1 text-xs ${state.sukses ? "text-teal-700" : "text-clay-700"}`}>{state.pesan}</p>
      )}
    </div>
  );
}
