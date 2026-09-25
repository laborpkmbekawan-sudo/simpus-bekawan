"use client";

import { useFormState, useFormStatus } from "react-dom";
import { perbaruiJejaringAction } from "./actions";
import { LABEL_JENIS_JEJARING } from "./form-jejaring";

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

export type JejaringBaris = {
  id: string;
  nama: string;
  jenis: string;
  penanggung_jawab: string | null;
  kontak: string | null;
  alamat: string | null;
  status_kerjasama: string;
  catatan: string | null;
};

const WARNA_STATUS: Record<string, string> = {
  aktif: "bg-teal-500/10 text-teal-700",
  nonaktif: "bg-clay-600/10 text-clay-700",
};

export default function BarisJejaring({ jejaring }: { jejaring: JejaringBaris }) {
  const [state, formAction] = useFormState(perbaruiJejaringAction, null);

  return (
    <div className="rounded-sm border border-sand-100 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-ink/50">{LABEL_JENIS_JEJARING[jejaring.jenis] ?? jejaring.jenis}</p>
          <p className="mt-0.5 text-sm font-semibold text-ink">{jejaring.nama}</p>
          <p className="mt-1 text-xs text-ink/50">
            {jejaring.penanggung_jawab ?? "—"}
            {jejaring.kontak ? ` · ${jejaring.kontak}` : ""}
            {jejaring.alamat ? ` · ${jejaring.alamat}` : ""}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${WARNA_STATUS[jejaring.status_kerjasama]}`}>
          {jejaring.status_kerjasama === "aktif" ? "Aktif" : "Nonaktif"}
        </span>
      </div>

      <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-sand-100 pt-3">
        <input type="hidden" name="id" value={jejaring.id} />

        <div className="min-w-[220px] flex-1 space-y-1">
          <label className="text-xs font-bold text-ink/60">Catatan</label>
          <input name="catatan" defaultValue={jejaring.catatan ?? ""} className={`${inputCls} w-full`} />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-ink/60">Status kerja sama</label>
          <select name="status_kerjasama" defaultValue={jejaring.status_kerjasama} className={inputCls}>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
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
