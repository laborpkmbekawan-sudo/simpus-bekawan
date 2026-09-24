"use client";

import { useFormState, useFormStatus } from "react-dom";
import { perbaruiRisikoAction } from "./actions";
import { LABEL_KATEGORI } from "./form-tambah";

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

export type RisikoBaris = {
  id: string;
  kategori: string;
  uraian: string;
  penyebab: string | null;
  level_risiko: string;
  rencana_mitigasi: string | null;
  status: string;
  penanggung_jawab_id: string | null;
};

const WARNA_LEVEL: Record<string, string> = {
  rendah: "bg-teal-500/10 text-teal-700",
  sedang: "bg-amber-500/10 text-amber-700",
  tinggi: "bg-clay-600/10 text-clay-700",
};

const LABEL_STATUS: Record<string, string> = {
  teridentifikasi: "Teridentifikasi",
  dalam_mitigasi: "Dalam Mitigasi",
  terkendali: "Terkendali",
};

export default function BarisRisiko({ risiko, daftarPegawai }: { risiko: RisikoBaris; daftarPegawai: Pegawai[] }) {
  const [state, formAction] = useFormState(perbaruiRisikoAction, null);

  return (
    <div className="rounded-sm border border-sand-100 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">{risiko.uraian}</p>
          <p className="text-xs text-ink/50">
            {LABEL_KATEGORI[risiko.kategori] ?? risiko.kategori}
            {risiko.penyebab ? ` · Penyebab: ${risiko.penyebab}` : ""}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${WARNA_LEVEL[risiko.level_risiko]}`}>
          Risiko {risiko.level_risiko}
        </span>
      </div>

      <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-sand-100 pt-3">
        <input type="hidden" name="id" value={risiko.id} />

        <div className="space-y-1">
          <label className="text-xs font-bold text-ink/60">Penanggung jawab</label>
          <select name="penanggung_jawab_id" defaultValue={risiko.penanggung_jawab_id ?? ""} className={inputCls}>
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
          <select name="status" defaultValue={risiko.status} className={inputCls}>
            <option value="teridentifikasi">Teridentifikasi</option>
            <option value="dalam_mitigasi">Dalam Mitigasi</option>
            <option value="terkendali">Terkendali</option>
          </select>
        </div>

        <div className="min-w-[200px] flex-1 space-y-1">
          <label className="text-xs font-bold text-ink/60">Rencana mitigasi</label>
          <input name="rencana_mitigasi" defaultValue={risiko.rencana_mitigasi ?? ""} className={`${inputCls} w-full`} />
        </div>

        <TombolSimpanKecil />
      </form>

      <p className="mt-2 text-xs text-ink/50">Status saat ini: {LABEL_STATUS[risiko.status]}</p>

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
