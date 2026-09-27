"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { batalkanImunisasiWusAction, catatImunisasiWusAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

const LABEL_STATUS_TT: Record<string, string> = {
  t1: "T1",
  t2: "T2",
  t3: "T3",
  t4: "T4",
  t5: "T5 (Lengkap)",
  belum_diketahui: "Belum Diketahui",
};

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Skrining"}
    </button>
  );
}

export type ImunisasiWusTercatat = {
  id: string;
  status_tt: string;
  diberikan_hari_ini: boolean;
  jenis_vaksin: string | null;
  jadwal_berikutnya: string | null;
  tindak_lanjut: string | null;
  dicatat_pada: string;
};

function waktuWib(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });
}

function tanggalWib(tgl: string | null) {
  if (!tgl) return "—";
  return new Date(tgl).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });
}

export default function FormImunisasiWus({
  kunjunganId,
  daftarSkrining,
}: {
  kunjunganId: string;
  daftarSkrining: ImunisasiWusTercatat[];
}) {
  const [state, formAction] = useFormState(catatImunisasiWusAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-5">
      <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <input type="hidden" name="kunjungan_id" value={kunjunganId} />

        <div className="space-y-1.5">
          <label htmlFor="iw_status_tt" className={labelCls}>Status TT sebelumnya</label>
          <select id="iw_status_tt" name="status_tt" defaultValue="belum_diketahui" className={inputCls}>
            {Object.entries(LABEL_STATUS_TT).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="iw_diberikan" className={labelCls}>Diberikan hari ini?</label>
          <select id="iw_diberikan" name="diberikan_hari_ini" defaultValue="tidak" className={inputCls}>
            <option value="tidak">Tidak</option>
            <option value="ya">Ya</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="iw_jenis_vaksin" className={labelCls}>Jenis vaksin</label>
          <select id="iw_jenis_vaksin" name="jenis_vaksin" defaultValue="" className={inputCls}>
            <option value="">— Tidak diberikan —</option>
            <option value="td">Td</option>
            <option value="tt">TT</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="iw_batch" className={labelCls}>Nomor batch</label>
          <input id="iw_batch" name="nomor_batch" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="iw_kipi" className={labelCls}>Reaksi KIPI</label>
          <input id="iw_kipi" name="reaksi_kipi" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="iw_jadwal" className={labelCls}>Jadwal berikutnya</label>
          <input id="iw_jadwal" name="jadwal_berikutnya" type="date" className={inputCls} />
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor="iw_catatan" className={labelCls}>Catatan</label>
          <textarea id="iw_catatan" name="catatan" rows={2} className={inputCls} />
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor="iw_tindaklanjut" className={labelCls}>Tindak lanjut</label>
          <input id="iw_tindaklanjut" name="tindak_lanjut" className={inputCls} />
        </div>

        <div className="sm:col-span-3">
          {state?.pesan && (
            <p
              role="alert"
              className={`mb-3 rounded-sm px-3.5 py-2.5 text-sm ${
                state.sukses ? "bg-teal-500/10 text-teal-700" : "bg-clay-600/10 text-clay-700"
              }`}
            >
              {state.pesan}
            </p>
          )}
          <TombolSimpan />
        </div>
      </form>

      <div>
        <p className="mb-2 text-sm font-bold text-ink">Skrining Tercatat</p>
        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                <th className="px-4 py-2.5 font-medium">Tanggal</th>
                <th className="px-4 py-2.5 font-medium">Status TT</th>
                <th className="px-4 py-2.5 font-medium">Diberikan</th>
                <th className="px-4 py-2.5 font-medium">Jadwal berikutnya</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {daftarSkrining.map((s) => (
                <tr key={s.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-4 py-2.5 text-ink/70">{waktuWib(s.dicatat_pada)}</td>
                  <td className="px-4 py-2.5 text-ink">{LABEL_STATUS_TT[s.status_tt] ?? s.status_tt}</td>
                  <td className="px-4 py-2.5 text-ink/70">
                    {s.diberikan_hari_ini ? (s.jenis_vaksin?.toUpperCase() ?? "Ya") : "Tidak"}
                  </td>
                  <td className="px-4 py-2.5 text-ink/70">{tanggalWib(s.jadwal_berikutnya)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => batalkanImunisasiWusAction(s.id, kunjunganId)}
                      className="text-xs font-medium text-clay-700 underline decoration-clay-700/30 underline-offset-2"
                    >
                      Batalkan
                    </button>
                  </td>
                </tr>
              ))}
              {daftarSkrining.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-ink/45">
                    Belum ada skrining imunisasi WUS tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
