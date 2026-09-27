"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { batalkanKesproCatenAction, catatKesproCatenAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

const LABEL_GOLDA: Record<string, string> = { a: "A", b: "B", ab: "AB", o: "O", belum_diketahui: "Belum diketahui" };
const LABEL_TT: Record<string, string> = {
  t1: "T1",
  t2: "T2",
  t3: "T3",
  t4: "T4",
  t5: "T5",
  belum_imunisasi: "Belum imunisasi",
};
const LABEL_HASIL: Record<string, string> = {
  non_reaktif: "Non-Reaktif",
  reaktif: "Reaktif",
  tidak_diperiksa: "Tidak Diperiksa",
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

function BadgeReaktif({ hasil }: { hasil: string }) {
  if (hasil === "tidak_diperiksa") return <span className="text-ink/40">—</span>;
  const reaktif = hasil === "reaktif";
  return (
    <span className={`rounded-sm px-2 py-0.5 text-xs font-medium ${reaktif ? "bg-clay-600/10 text-clay-700" : "bg-teal-700/10 text-teal-700"}`}>
      {LABEL_HASIL[hasil]}
    </span>
  );
}

export type KesproCatenTercatat = {
  id: string;
  status_caten: string;
  lila: number | null;
  hb: number | null;
  hasil_hiv: string;
  hasil_sifilis: string;
  hasil_hepatitis_b: string;
  rekomendasi: string;
  tindak_lanjut: string | null;
  dicatat_pada: string;
};

function waktuWib(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });
}

export default function FormKesproCaten({
  kunjunganId,
  daftarPemeriksaan,
}: {
  kunjunganId: string;
  daftarPemeriksaan: KesproCatenTercatat[];
}) {
  const [state, formAction] = useFormState(catatKesproCatenAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-5">
      <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <input type="hidden" name="kunjungan_id" value={kunjunganId} />

        <div className="space-y-1.5">
          <label htmlFor="kc_status" className={labelCls}>Status</label>
          <select id="kc_status" name="status_caten" defaultValue="caten" className={inputCls}>
            <option value="caten">Calon Pengantin</option>
            <option value="usia_reproduksi">Usia Reproduksi (Umum)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kc_hpht" className={labelCls}>HPHT (kalau perempuan)</label>
          <input id="kc_hpht" name="hpht" type="date" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kc_lila" className={labelCls}>LILA (cm)</label>
          <input id="kc_lila" name="lila" type="number" step="0.1" placeholder="< 23.5 = risiko KEK" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kc_imt" className={labelCls}>IMT</label>
          <input id="kc_imt" name="imt" type="number" step="0.1" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kc_hb" className={labelCls}>Hb (g/dL)</label>
          <input id="kc_hb" name="hb" type="number" step="0.1" placeholder="< 12 = risiko anemia" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kc_golda" className={labelCls}>Golongan darah</label>
          <select id="kc_golda" name="golongan_darah" defaultValue="" className={inputCls}>
            <option value="">— Belum diperiksa —</option>
            {Object.entries(LABEL_GOLDA).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kc_rhesus" className={labelCls}>Rhesus</label>
          <select id="kc_rhesus" name="rhesus" defaultValue="" className={inputCls}>
            <option value="">— Belum diperiksa —</option>
            <option value="positif">Positif</option>
            <option value="negatif">Negatif</option>
            <option value="belum_diketahui">Belum diketahui</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kc_tt" className={labelCls}>Status imunisasi TT</label>
          <select id="kc_tt" name="status_tt" defaultValue="" className={inputCls}>
            <option value="">— Belum dicek —</option>
            {Object.entries(LABEL_TT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <p className="text-sm font-bold text-ink sm:col-span-3">Skrining Tiga Penyakit</p>

        <div className="space-y-1.5">
          <label htmlFor="kc_hiv" className={labelCls}>HIV</label>
          <select id="kc_hiv" name="hasil_hiv" defaultValue="tidak_diperiksa" className={inputCls}>
            <option value="tidak_diperiksa">Tidak Diperiksa</option>
            <option value="non_reaktif">Non-Reaktif</option>
            <option value="reaktif">Reaktif</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kc_sifilis" className={labelCls}>Sifilis</label>
          <select id="kc_sifilis" name="hasil_sifilis" defaultValue="tidak_diperiksa" className={inputCls}>
            <option value="tidak_diperiksa">Tidak Diperiksa</option>
            <option value="non_reaktif">Non-Reaktif</option>
            <option value="reaktif">Reaktif</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kc_hepb" className={labelCls}>Hepatitis B</label>
          <select id="kc_hepb" name="hasil_hepatitis_b" defaultValue="tidak_diperiksa" className={inputCls}>
            <option value="tidak_diperiksa">Tidak Diperiksa</option>
            <option value="non_reaktif">Non-Reaktif</option>
            <option value="reaktif">Reaktif</option>
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor="kc_konseling" className={labelCls}>Konseling diberikan</label>
          <input id="kc_konseling" name="konseling_diberikan" placeholder="contoh: Gizi pranikah, KB pasca nikah" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kc_rekomendasi" className={labelCls}>Rekomendasi</label>
          <select id="kc_rekomendasi" name="rekomendasi" defaultValue="layak" className={inputCls}>
            <option value="layak">Layak</option>
            <option value="perlu_tindak_lanjut">Perlu Tindak Lanjut</option>
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="kc_tindaklanjut" className={labelCls}>Tindak lanjut</label>
          <input id="kc_tindaklanjut" name="tindak_lanjut" className={inputCls} />
        </div>

        <div className="sm:col-span-3">
          {state?.pesan && (
            <p role="alert" className={`mb-3 rounded-sm px-3.5 py-2.5 text-sm ${state.sukses ? "bg-teal-500/10 text-teal-700" : "bg-clay-600/10 text-clay-700"}`}>
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
                <th className="px-4 py-2.5 font-medium">LILA / Hb</th>
                <th className="px-4 py-2.5 font-medium">HIV</th>
                <th className="px-4 py-2.5 font-medium">Sifilis</th>
                <th className="px-4 py-2.5 font-medium">Hep. B</th>
                <th className="px-4 py-2.5 font-medium">Rekomendasi</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {daftarPemeriksaan.map((p) => (
                <tr key={p.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-4 py-2.5 text-ink/70">{waktuWib(p.dicatat_pada)}</td>
                  <td className="px-4 py-2.5 text-ink/70">
                    {p.lila ?? "—"} cm / {p.hb ?? "—"} g/dL
                  </td>
                  <td className="px-4 py-2.5"><BadgeReaktif hasil={p.hasil_hiv} /></td>
                  <td className="px-4 py-2.5"><BadgeReaktif hasil={p.hasil_sifilis} /></td>
                  <td className="px-4 py-2.5"><BadgeReaktif hasil={p.hasil_hepatitis_b} /></td>
                  <td className="px-4 py-2.5 text-ink/70">
                    {p.rekomendasi === "perlu_tindak_lanjut" ? "Perlu Tindak Lanjut" : "Layak"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => batalkanKesproCatenAction(p.id, kunjunganId)}
                      className="text-xs font-medium text-clay-700 underline decoration-clay-700/30 underline-offset-2"
                    >
                      Batalkan
                    </button>
                  </td>
                </tr>
              ))}
              {daftarPemeriksaan.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-ink/45">Belum ada pemeriksaan kespro tercatat.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
