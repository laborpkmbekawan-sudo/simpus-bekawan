"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { batalkanSkriningInderaAction, catatSkriningInderaAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

const LABEL_HASIL: Record<string, string> = {
  tidak_diperiksa: "Tidak Diperiksa",
  normal: "Normal",
  gangguan_ringan: "Gangguan Ringan",
  gangguan_berat: "Gangguan Berat",
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

function Badge({ nilai }: { nilai: string }) {
  if (nilai === "tidak_diperiksa") return <span className="text-ink/40">—</span>;
  const perlu = nilai === "gangguan_ringan" || nilai === "gangguan_berat";
  return (
    <span className={`rounded-sm px-2 py-0.5 text-xs font-medium ${perlu ? "bg-clay-600/10 text-clay-700" : "bg-teal-700/10 text-teal-700"}`}>
      {LABEL_HASIL[nilai] ?? nilai}
    </span>
  );
}

export type SkriningInderaTercatat = {
  id: string;
  hasil_penglihatan: string;
  hasil_pendengaran: string;
  penggunaan_alat_bantu: string | null;
  tindak_lanjut: string | null;
  dicatat_pada: string;
};

function waktuWib(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });
}

export default function FormSkriningIndera({
  kunjunganId,
  daftarSkrining,
}: {
  kunjunganId: string;
  daftarSkrining: SkriningInderaTercatat[];
}) {
  const [state, formAction] = useFormState(catatSkriningInderaAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-5">
      <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <input type="hidden" name="kunjungan_id" value={kunjunganId} />

        <div className="space-y-1.5">
          <label htmlFor="si_lihat" className={labelCls}>Penglihatan</label>
          <select id="si_lihat" name="hasil_penglihatan" defaultValue="tidak_diperiksa" className={inputCls}>
            {Object.entries(LABEL_HASIL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="si_dengar" className={labelCls}>Pendengaran</label>
          <select id="si_dengar" name="hasil_pendengaran" defaultValue="tidak_diperiksa" className={inputCls}>
            {Object.entries(LABEL_HASIL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="si_alat" className={labelCls}>Alat bantu</label>
          <input
            id="si_alat"
            name="penggunaan_alat_bantu"
            placeholder="kacamata / alat bantu dengar"
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor="si_catatan" className={labelCls}>Catatan temuan</label>
          <textarea id="si_catatan" name="catatan_temuan" rows={2} className={inputCls} />
        </div>

        <div className="space-y-1.5 sm:col-span-1">
          <label htmlFor="si_rujukan" className={labelCls}>Rujukan</label>
          <input id="si_rujukan" name="rujukan" className={inputCls} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="si_tindaklanjut" className={labelCls}>Tindak lanjut</label>
          <input id="si_tindaklanjut" name="tindak_lanjut" className={inputCls} />
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
                <th className="px-4 py-2.5 font-medium">Penglihatan</th>
                <th className="px-4 py-2.5 font-medium">Pendengaran</th>
                <th className="px-4 py-2.5 font-medium">Alat bantu</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {daftarSkrining.map((s) => (
                <tr key={s.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-4 py-2.5 text-ink/70">{waktuWib(s.dicatat_pada)}</td>
                  <td className="px-4 py-2.5"><Badge nilai={s.hasil_penglihatan} /></td>
                  <td className="px-4 py-2.5"><Badge nilai={s.hasil_pendengaran} /></td>
                  <td className="px-4 py-2.5 text-ink/70">{s.penggunaan_alat_bantu ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => batalkanSkriningInderaAction(s.id, kunjunganId)}
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
                    Belum ada skrining indera tercatat.
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
