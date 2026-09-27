"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { batalkanKankerTalasemiaAction, catatKankerTalasemiaAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

const LABEL_IVA: Record<string, string> = { tidak_dilakukan: "Tidak Dilakukan", normal: "Normal", positif: "Positif" };
const LABEL_SADANIS: Record<string, string> = { tidak_dilakukan: "Tidak Dilakukan", normal: "Normal", benjolan_dicurigai: "Benjolan Dicurigai" };
const LABEL_TALASEMIA: Record<string, string> = { tidak_diperiksa: "Tidak Diperiksa", negatif: "Negatif", carrier_suspek: "Carrier/Suspek" };

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

function Badge({ nilai, label }: { nilai: string; label: Record<string, string> }) {
  if (nilai === "tidak_dilakukan" || nilai === "tidak_diperiksa") return <span className="text-ink/40">—</span>;
  const perluPerhatian = ["positif", "benjolan_dicurigai", "carrier_suspek"].includes(nilai);
  return (
    <span className={`rounded-sm px-2 py-0.5 text-xs font-medium ${perluPerhatian ? "bg-clay-600/10 text-clay-700" : "bg-teal-700/10 text-teal-700"}`}>
      {label[nilai]}
    </span>
  );
}

export type KankerTalasemiaTercatat = {
  id: string;
  hasil_iva: string;
  hasil_sadanis: string;
  hasil_talasemia: string;
  tindak_lanjut: string | null;
  dicatat_pada: string;
};

function waktuWib(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });
}

export default function FormKankerTalasemia({
  kunjunganId,
  daftarPemeriksaan,
}: {
  kunjunganId: string;
  daftarPemeriksaan: KankerTalasemiaTercatat[];
}) {
  const [state, formAction] = useFormState(catatKankerTalasemiaAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-5">
      <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <input type="hidden" name="kunjungan_id" value={kunjunganId} />

        <div className="space-y-1.5">
          <label htmlFor="kt_iva" className={labelCls}>Hasil IVA</label>
          <select id="kt_iva" name="hasil_iva" defaultValue="tidak_dilakukan" className={inputCls}>
            {Object.entries(LABEL_IVA).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kt_sadanis" className={labelCls}>Hasil SADANIS</label>
          <select id="kt_sadanis" name="hasil_sadanis" defaultValue="tidak_dilakukan" className={inputCls}>
            {Object.entries(LABEL_SADANIS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kt_talasemia" className={labelCls}>Skrining talasemia</label>
          <select id="kt_talasemia" name="hasil_talasemia" defaultValue="tidak_diperiksa" className={inputCls}>
            {Object.entries(LABEL_TALASEMIA).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor="kt_catatan" className={labelCls}>Catatan temuan</label>
          <textarea id="kt_catatan" name="catatan_temuan" rows={2} className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kt_rujukan" className={labelCls}>Rujukan</label>
          <input id="kt_rujukan" name="rujukan" className={inputCls} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="kt_tindaklanjut" className={labelCls}>Tindak lanjut</label>
          <input id="kt_tindaklanjut" name="tindak_lanjut" className={inputCls} />
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
                <th className="px-4 py-2.5 font-medium">IVA</th>
                <th className="px-4 py-2.5 font-medium">SADANIS</th>
                <th className="px-4 py-2.5 font-medium">Talasemia</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {daftarPemeriksaan.map((p) => (
                <tr key={p.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-4 py-2.5 text-ink/70">{waktuWib(p.dicatat_pada)}</td>
                  <td className="px-4 py-2.5"><Badge nilai={p.hasil_iva} label={LABEL_IVA} /></td>
                  <td className="px-4 py-2.5"><Badge nilai={p.hasil_sadanis} label={LABEL_SADANIS} /></td>
                  <td className="px-4 py-2.5"><Badge nilai={p.hasil_talasemia} label={LABEL_TALASEMIA} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => batalkanKankerTalasemiaAction(p.id, kunjunganId)}
                      className="text-xs font-medium text-clay-700 underline decoration-clay-700/30 underline-offset-2"
                    >
                      Batalkan
                    </button>
                  </td>
                </tr>
              ))}
              {daftarPemeriksaan.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-ink/45">
                    Belum ada skrining kanker & talasemia tercatat.
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
