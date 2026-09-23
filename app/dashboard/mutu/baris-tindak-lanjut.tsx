"use client";

import { useFormState, useFormStatus } from "react-dom";
import { perbaruiTindakLanjutAction } from "./actions";

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

export type InsidenMutu = {
  id: string;
  tanggal: string;
  jenis: string;
  uraian: string;
  tingkat_risiko: string;
  tindakan_awal: string | null;
  penanggung_jawab_id: string | null;
  batas_waktu: string | null;
  status_tindak_lanjut: string;
  bukti_penyelesaian: string | null;
  pelapor: { nama_lengkap: string } | null;
};

const LABEL_JENIS: Record<string, string> = {
  insiden: "Insiden keselamatan pasien",
  keluhan: "Keluhan",
  ketidaklengkapan_rm: "Ketidaklengkapan RM",
};

const WARNA_RISIKO: Record<string, string> = {
  rendah: "bg-teal-500/10 text-teal-700",
  sedang: "bg-amber-500/10 text-amber-700",
  tinggi: "bg-clay-600/10 text-clay-700",
};

export default function BarisTindakLanjut({
  insiden,
  daftarPegawai,
  bisaKelola,
}: {
  insiden: InsidenMutu;
  daftarPegawai: Pegawai[];
  bisaKelola: boolean;
}) {
  const [state, formAction] = useFormState(perbaruiTindakLanjutAction, null);

  return (
    <div className="rounded-sm border border-sand-100 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">{LABEL_JENIS[insiden.jenis] ?? insiden.jenis}</p>
          <p className="text-xs text-ink/50">
            {insiden.tanggal} · Pelapor: {insiden.pelapor?.nama_lengkap ?? "—"}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${WARNA_RISIKO[insiden.tingkat_risiko]}`}>
          Risiko {insiden.tingkat_risiko}
        </span>
      </div>

      <p className="mt-2 text-sm text-ink/80">{insiden.uraian}</p>
      {insiden.tindakan_awal && (
        <p className="mt-1 text-xs text-ink/50">Tindakan awal: {insiden.tindakan_awal}</p>
      )}

      {bisaKelola ? (
        <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-sand-100 pt-3">
          <input type="hidden" name="id" value={insiden.id} />

          <div className="space-y-1">
            <label className="text-xs font-bold text-ink/60">Penanggung jawab</label>
            <select
              name="penanggung_jawab_id"
              defaultValue={insiden.penanggung_jawab_id ?? ""}
              className={inputCls}
            >
              <option value="">— Belum ditunjuk —</option>
              {daftarPegawai.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama_lengkap}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-ink/60">Batas waktu</label>
            <input type="date" name="batas_waktu" defaultValue={insiden.batas_waktu ?? ""} className={inputCls} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-ink/60">Status</label>
            <select name="status_tindak_lanjut" defaultValue={insiden.status_tindak_lanjut} className={inputCls}>
              <option value="baru">Baru</option>
              <option value="proses">Proses</option>
              <option value="selesai">Selesai</option>
            </select>
          </div>

          <div className="min-w-[180px] flex-1 space-y-1">
            <label className="text-xs font-bold text-ink/60">Bukti penyelesaian</label>
            <input
              name="bukti_penyelesaian"
              defaultValue={insiden.bukti_penyelesaian ?? ""}
              className={`${inputCls} w-full`}
            />
          </div>

          <TombolSimpanKecil />
        </form>
      ) : (
        <p className="mt-3 border-t border-sand-100 pt-3 text-xs text-ink/50">
          Status: {insiden.status_tindak_lanjut}
          {insiden.batas_waktu ? ` · Batas waktu: ${insiden.batas_waktu}` : ""}
        </p>
      )}

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
