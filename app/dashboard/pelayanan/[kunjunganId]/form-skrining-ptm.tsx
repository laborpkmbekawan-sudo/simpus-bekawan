"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { batalkanSkriningPtmAction, catatSkriningPtmAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

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

export type SkriningPtmTercatat = {
  id: string;
  td_sistolik: number | null;
  td_diastolik: number | null;
  gula_darah_puasa: number | null;
  gula_darah_sewaktu: number | null;
  imt: number | null;
  hasil_skrining: string;
  tindak_lanjut: string | null;
  dicatat_pada: string;
};

function waktuWib(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });
}

export default function FormSkriningPtm({
  kunjunganId,
  daftarSkrining,
}: {
  kunjunganId: string;
  daftarSkrining: SkriningPtmTercatat[];
}) {
  const [state, formAction] = useFormState(catatSkriningPtmAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-5">
      <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <input type="hidden" name="kunjungan_id" value={kunjunganId} />

        <div className="space-y-1.5">
          <label htmlFor="sp_bb" className={labelCls}>Berat badan (kg)</label>
          <input id="sp_bb" name="berat_badan" type="number" step="0.1" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sp_tb" className={labelCls}>Tinggi badan (cm)</label>
          <input id="sp_tb" name="tinggi_badan" type="number" step="0.1" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sp_imt" className={labelCls}>IMT</label>
          <input id="sp_imt" name="imt" type="number" step="0.1" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sp_lp" className={labelCls}>Lingkar perut (cm)</label>
          <input id="sp_lp" name="lingkar_perut" type="number" step="0.1" placeholder="L>90 / P>80 = risiko" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sp_tds" className={labelCls}>TD Sistolik</label>
          <input id="sp_tds" name="td_sistolik" type="number" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sp_tdd" className={labelCls}>TD Diastolik</label>
          <input id="sp_tdd" name="td_diastolik" type="number" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sp_gdp" className={labelCls}>Gula darah puasa</label>
          <input id="sp_gdp" name="gula_darah_puasa" type="number" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sp_gds" className={labelCls}>Gula darah sewaktu</label>
          <input id="sp_gds" name="gula_darah_sewaktu" type="number" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sp_kolesterol" className={labelCls}>Kolesterol total</label>
          <input id="sp_kolesterol" name="kolesterol_total" type="number" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sp_asamurat" className={labelCls}>Asam urat</label>
          <input id="sp_asamurat" name="asam_urat" type="number" step="0.1" className={inputCls} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="sp_faktorrisiko" className={labelCls}>Faktor risiko</label>
          <input id="sp_faktorrisiko" name="faktor_risiko" placeholder="contoh: Merokok, riwayat keluarga DM" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sp_hasil" className={labelCls}>Hasil skrining</label>
          <select id="sp_hasil" name="hasil_skrining" defaultValue="normal" className={inputCls}>
            <option value="normal">Normal</option>
            <option value="perlu_rujukan">Perlu Rujukan</option>
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor="sp_tindaklanjut" className={labelCls}>Tindak lanjut</label>
          <input id="sp_tindaklanjut" name="tindak_lanjut" className={inputCls} />
        </div>

        <div className="sm:col-span-4">
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
                <th className="px-4 py-2.5 font-medium">TD</th>
                <th className="px-4 py-2.5 font-medium">GD Puasa/Sewaktu</th>
                <th className="px-4 py-2.5 font-medium">IMT</th>
                <th className="px-4 py-2.5 font-medium">Hasil</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {daftarSkrining.map((s) => (
                <tr key={s.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-4 py-2.5 text-ink/70">{waktuWib(s.dicatat_pada)}</td>
                  <td className="px-4 py-2.5 text-ink/70">
                    {s.td_sistolik ?? "—"}/{s.td_diastolik ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-ink/70">
                    {s.gula_darah_puasa ?? "—"} / {s.gula_darah_sewaktu ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-ink/70">{s.imt ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
                        s.hasil_skrining === "perlu_rujukan" ? "bg-clay-600/10 text-clay-700" : "bg-teal-700/10 text-teal-700"
                      }`}
                    >
                      {s.hasil_skrining === "perlu_rujukan" ? "Perlu Rujukan" : "Normal"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => batalkanSkriningPtmAction(s.id, kunjunganId)}
                      className="text-xs font-medium text-clay-700 underline decoration-clay-700/30 underline-offset-2"
                    >
                      Batalkan
                    </button>
                  </td>
                </tr>
              ))}
              {daftarSkrining.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-ink/45">
                    Belum ada skrining PTM tercatat.
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
