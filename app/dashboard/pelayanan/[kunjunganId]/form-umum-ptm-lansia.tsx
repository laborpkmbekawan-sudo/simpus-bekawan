"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { batalkanUmumPtmLansiaAction, catatUmumPtmLansiaAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

const LABEL_STATUS_GIZI: Record<string, string> = {
  kurang: "Kurang",
  normal: "Normal",
  lebih: "Lebih",
  obesitas: "Obesitas",
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
      {pending ? "Menyimpan..." : "Simpan Pemeriksaan"}
    </button>
  );
}

export type UmumPtmLansiaTercatat = {
  id: string;
  td_sistolik: number | null;
  td_diastolik: number | null;
  imt: number | null;
  hasil_skrining: string;
  tindak_lanjut: string | null;
  dicatat_pada: string;
};

function waktuWib(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });
}

function Badge({ nilai }: { nilai: string }) {
  const perluRujukan = nilai === "perlu_rujukan";
  return (
    <span className={`rounded-sm px-2 py-0.5 text-xs font-medium ${perluRujukan ? "bg-clay-600/10 text-clay-700" : "bg-teal-700/10 text-teal-700"}`}>
      {perluRujukan ? "Perlu Rujukan" : "Normal"}
    </span>
  );
}

export default function FormUmumPtmLansia({
  kunjunganId,
  daftarPemeriksaan,
}: {
  kunjunganId: string;
  daftarPemeriksaan: UmumPtmLansiaTercatat[];
}) {
  const [state, formAction] = useFormState(catatUmumPtmLansiaAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-5">
      <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <input type="hidden" name="kunjungan_id" value={kunjunganId} />

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor="upl_keluhan" className={labelCls}>Keluhan umum</label>
          <textarea id="upl_keluhan" name="keluhan_umum" rows={2} className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="upl_bb" className={labelCls}>Berat badan (kg)</label>
          <input id="upl_bb" name="berat_badan" type="number" step="0.1" className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="upl_tb" className={labelCls}>Tinggi badan (cm)</label>
          <input id="upl_tb" name="tinggi_badan" type="number" step="0.1" className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="upl_imt" className={labelCls}>IMT</label>
          <input id="upl_imt" name="imt" type="number" step="0.1" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="upl_lp" className={labelCls}>Lingkar perut (cm)</label>
          <input id="upl_lp" name="lingkar_perut" type="number" step="0.1" className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="upl_tds" className={labelCls}>TD sistolik</label>
          <input id="upl_tds" name="td_sistolik" type="number" className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="upl_tdd" className={labelCls}>TD diastolik</label>
          <input id="upl_tdd" name="td_diastolik" type="number" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="upl_gdp" className={labelCls}>Gula darah puasa</label>
          <input id="upl_gdp" name="gula_darah_puasa" type="number" className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="upl_gds" className={labelCls}>Gula darah sewaktu</label>
          <input id="upl_gds" name="gula_darah_sewaktu" type="number" className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="upl_kol" className={labelCls}>Kolesterol total</label>
          <input id="upl_kol" name="kolesterol_total" type="number" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="upl_asam" className={labelCls}>Asam urat</label>
          <input id="upl_asam" name="asam_urat" type="number" step="0.1" className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="upl_gizi" className={labelCls}>Status gizi</label>
          <select id="upl_gizi" name="status_gizi" defaultValue="" className={inputCls}>
            <option value="">— Belum dinilai —</option>
            {Object.entries(LABEL_STATUS_GIZI).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="upl_hasil" className={labelCls}>Hasil skrining</label>
          <select id="upl_hasil" name="hasil_skrining" defaultValue="normal" className={inputCls}>
            <option value="normal">Normal</option>
            <option value="perlu_rujukan">Perlu Rujukan</option>
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor="upl_tindaklanjut" className={labelCls}>Tindak lanjut</label>
          <input id="upl_tindaklanjut" name="tindak_lanjut" className={inputCls} />
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
        <p className="mb-2 text-sm font-bold text-ink">Pemeriksaan Tercatat</p>
        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                <th className="px-4 py-2.5 font-medium">Tanggal</th>
                <th className="px-4 py-2.5 font-medium">TD</th>
                <th className="px-4 py-2.5 font-medium">IMT</th>
                <th className="px-4 py-2.5 font-medium">Hasil</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {daftarPemeriksaan.map((p) => (
                <tr key={p.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-4 py-2.5 text-ink/70">{waktuWib(p.dicatat_pada)}</td>
                  <td className="px-4 py-2.5 text-ink">
                    {p.td_sistolik != null && p.td_diastolik != null ? `${p.td_sistolik}/${p.td_diastolik}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-ink/70">{p.imt ?? "—"}</td>
                  <td className="px-4 py-2.5"><Badge nilai={p.hasil_skrining} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => batalkanUmumPtmLansiaAction(p.id, kunjunganId)}
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
                    Belum ada pemeriksaan tercatat.
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
