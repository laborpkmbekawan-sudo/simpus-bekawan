"use client";

import { useFormState, useFormStatus } from "react-dom";
import { perbaruiTemuanAction } from "./actions";
import { LABEL_JENIS_AUDIT } from "./form-tambah";

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

export type TemuanBaris = {
  id: string;
  tanggal: string;
  jenis_audit: string;
  temuan: string;
  rekomendasi: string | null;
  batas_waktu: string | null;
  status_kepatuhan: string;
  bukti_tindak_lanjut: string | null;
  penanggung_jawab_id: string | null;
};

const WARNA_STATUS: Record<string, string> = {
  belum_sesuai: "bg-clay-600/10 text-clay-700",
  sebagian_sesuai: "bg-amber-500/10 text-amber-700",
  sesuai: "bg-teal-500/10 text-teal-700",
};

const LABEL_STATUS: Record<string, string> = {
  belum_sesuai: "Belum Sesuai",
  sebagian_sesuai: "Sebagian Sesuai",
  sesuai: "Sesuai",
};

export default function BarisTemuan({ temuan, daftarPegawai }: { temuan: TemuanBaris; daftarPegawai: Pegawai[] }) {
  const [state, formAction] = useFormState(perbaruiTemuanAction, null);

  return (
    <div className="rounded-sm border border-sand-100 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-ink/50">
            {temuan.tanggal} · {LABEL_JENIS_AUDIT[temuan.jenis_audit] ?? temuan.jenis_audit}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-ink">{temuan.temuan}</p>
          {temuan.rekomendasi && <p className="mt-1 text-xs text-ink/50">Rekomendasi: {temuan.rekomendasi}</p>}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${WARNA_STATUS[temuan.status_kepatuhan]}`}>
          {LABEL_STATUS[temuan.status_kepatuhan]}
        </span>
      </div>

      <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-sand-100 pt-3">
        <input type="hidden" name="id" value={temuan.id} />

        <div className="space-y-1">
          <label className="text-xs font-bold text-ink/60">Penanggung jawab</label>
          <select name="penanggung_jawab_id" defaultValue={temuan.penanggung_jawab_id ?? ""} className={inputCls}>
            <option value="">— Belum ditunjuk —</option>
            {daftarPegawai.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama_lengkap}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-ink/60">Status kepatuhan</label>
          <select name="status_kepatuhan" defaultValue={temuan.status_kepatuhan} className={inputCls}>
            <option value="belum_sesuai">Belum Sesuai</option>
            <option value="sebagian_sesuai">Sebagian Sesuai</option>
            <option value="sesuai">Sesuai</option>
          </select>
        </div>

        <div className="min-w-[180px] flex-1 space-y-1">
          <label className="text-xs font-bold text-ink/60">Bukti tindak lanjut</label>
          <input
            name="bukti_tindak_lanjut"
            defaultValue={temuan.bukti_tindak_lanjut ?? ""}
            className={`${inputCls} w-full`}
          />
        </div>

        <TombolSimpanKecil />
      </form>

      {temuan.batas_waktu && <p className="mt-2 text-xs text-ink/50">Batas waktu: {temuan.batas_waktu}</p>}

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
