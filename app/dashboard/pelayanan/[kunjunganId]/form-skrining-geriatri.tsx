"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { batalkanSkriningGeriatriAction, catatSkriningGeriatriAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

const LABEL_ADL: Record<string, string> = {
  mandiri: "Mandiri",
  ketergantungan_sebagian: "Ketergantungan Sebagian",
  ketergantungan_total: "Ketergantungan Total",
};
const LABEL_KOGNITIF: Record<string, string> = {
  normal: "Normal",
  gangguan_ringan: "Gangguan Ringan",
  gangguan_berat: "Gangguan Berat",
};
const LABEL_JATUH: Record<string, string> = { rendah: "Rendah", sedang: "Sedang", tinggi: "Tinggi" };
const LABEL_GIZI: Record<string, string> = { baik: "Baik", risiko_malnutrisi: "Risiko Malnutrisi", malnutrisi: "Malnutrisi" };
const LABEL_EMOSIONAL: Record<string, string> = { normal: "Normal", risiko_depresi: "Risiko Depresi" };

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

function Badge({ nilai, label, perluPerhatian }: { nilai: string; label: Record<string, string>; perluPerhatian: string[] }) {
  const perlu = perluPerhatian.includes(nilai);
  return (
    <span className={`rounded-sm px-2 py-0.5 text-xs font-medium ${perlu ? "bg-clay-600/10 text-clay-700" : "bg-teal-700/10 text-teal-700"}`}>
      {label[nilai] ?? nilai}
    </span>
  );
}

export type SkriningGeriatriTercatat = {
  id: string;
  status_adl: string;
  status_kognitif: string;
  risiko_jatuh: string;
  status_gizi: string;
  status_emosional: string;
  tindak_lanjut: string | null;
  dicatat_pada: string;
};

function waktuWib(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });
}

export default function FormSkriningGeriatri({
  kunjunganId,
  daftarSkrining,
}: {
  kunjunganId: string;
  daftarSkrining: SkriningGeriatriTercatat[];
}) {
  const [state, formAction] = useFormState(catatSkriningGeriatriAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-5">
      <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <input type="hidden" name="kunjungan_id" value={kunjunganId} />

        <div className="space-y-1.5">
          <label htmlFor="sg_adl" className={labelCls}>Status ADL</label>
          <select id="sg_adl" name="status_adl" defaultValue="mandiri" className={inputCls}>
            {Object.entries(LABEL_ADL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sg_kognitif" className={labelCls}>Status kognitif</label>
          <select id="sg_kognitif" name="status_kognitif" defaultValue="normal" className={inputCls}>
            {Object.entries(LABEL_KOGNITIF).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sg_jatuh" className={labelCls}>Risiko jatuh</label>
          <select id="sg_jatuh" name="risiko_jatuh" defaultValue="rendah" className={inputCls}>
            {Object.entries(LABEL_JATUH).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sg_gizi" className={labelCls}>Status gizi</label>
          <select id="sg_gizi" name="status_gizi" defaultValue="baik" className={inputCls}>
            {Object.entries(LABEL_GIZI).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sg_emosional" className={labelCls}>Status emosional</label>
          <select id="sg_emosional" name="status_emosional" defaultValue="normal" className={inputCls}>
            {Object.entries(LABEL_EMOSIONAL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor="sg_catatan" className={labelCls}>Catatan temuan</label>
          <textarea id="sg_catatan" name="catatan_temuan" rows={2} className={inputCls} />
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor="sg_tindaklanjut" className={labelCls}>Tindak lanjut</label>
          <input id="sg_tindaklanjut" name="tindak_lanjut" className={inputCls} />
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
                <th className="px-4 py-2.5 font-medium">ADL</th>
                <th className="px-4 py-2.5 font-medium">Kognitif</th>
                <th className="px-4 py-2.5 font-medium">Jatuh</th>
                <th className="px-4 py-2.5 font-medium">Gizi</th>
                <th className="px-4 py-2.5 font-medium">Emosional</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {daftarSkrining.map((s) => (
                <tr key={s.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-4 py-2.5 text-ink/70">{waktuWib(s.dicatat_pada)}</td>
                  <td className="px-4 py-2.5"><Badge nilai={s.status_adl} label={LABEL_ADL} perluPerhatian={["ketergantungan_sebagian", "ketergantungan_total"]} /></td>
                  <td className="px-4 py-2.5"><Badge nilai={s.status_kognitif} label={LABEL_KOGNITIF} perluPerhatian={["gangguan_ringan", "gangguan_berat"]} /></td>
                  <td className="px-4 py-2.5"><Badge nilai={s.risiko_jatuh} label={LABEL_JATUH} perluPerhatian={["sedang", "tinggi"]} /></td>
                  <td className="px-4 py-2.5"><Badge nilai={s.status_gizi} label={LABEL_GIZI} perluPerhatian={["risiko_malnutrisi", "malnutrisi"]} /></td>
                  <td className="px-4 py-2.5"><Badge nilai={s.status_emosional} label={LABEL_EMOSIONAL} perluPerhatian={["risiko_depresi"]} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => batalkanSkriningGeriatriAction(s.id, kunjunganId)}
                      className="text-xs font-medium text-clay-700 underline decoration-clay-700/30 underline-offset-2"
                    >
                      Batalkan
                    </button>
                  </td>
                </tr>
              ))}
              {daftarSkrining.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-ink/45">
                    Belum ada skrining geriatri tercatat.
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
