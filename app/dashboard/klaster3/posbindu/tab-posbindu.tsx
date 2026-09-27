"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  batalkanKegiatanPosbinduAction,
  batalkanKontrolProlanisAction,
  tambahKegiatanPosbinduAction,
  tambahKontrolProlanisAction,
} from "./actions";
import PilihPasienRingkas from "./pilih-pasien-ringkas";

export type PosyanduOpsi = { id: string; nama: string };

export type BarisPosbindu = {
  id: string;
  tanggal: string;
  noRm: string;
  namaPasien: string;
  namaPosyandu: string | null;
  beratBadan: number | null;
  tinggiBadan: number | null;
  tdSistolik: number | null;
  tdDiastolik: number | null;
  gulaDarahSewaktu: number | null;
  hasilSkrining: string;
  faktorRisiko: string | null;
};

export type BarisProlanis = {
  id: string;
  tanggalKontrol: string;
  noRm: string;
  namaPasien: string;
  jenisPenyakit: string;
  tdSistolik: number | null;
  tdDiastolik: number | null;
  gulaDarahPuasa: number | null;
  gulaDarahSewaktu: number | null;
  kepatuhanObat: string;
  keluhan: string | null;
};

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

const LABEL_PENYAKIT: Record<string, string> = {
  hipertensi: "Hipertensi",
  diabetes_melitus: "Diabetes Melitus",
  keduanya: "Hipertensi & Diabetes",
};

function tanggalPendek(tanggal: string) {
  return new Date(`${tanggal}T00:00:00Z`).toLocaleDateString("id-ID", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Pesan({ state }: { state: { pesan: string; sukses: boolean } | null }) {
  if (!state?.pesan) return null;
  return (
    <p
      role="alert"
      className={`rounded-sm px-3.5 py-2.5 text-sm sm:col-span-3 ${
        state.sukses ? "bg-teal-500/10 text-teal-700" : "bg-clay-600/10 text-clay-700"
      }`}
    >
      {state.pesan}
    </p>
  );
}

function TombolSimpan({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : label}
    </button>
  );
}

function BadgeSkrining({ status }: { status: string }) {
  const rujuk = status === "perlu_rujukan";
  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
        rujuk ? "bg-clay-600/10 text-clay-700" : "bg-teal-700/10 text-teal-700"
      }`}
    >
      {rujuk ? "Perlu Rujukan" : "Normal"}
    </span>
  );
}

function BadgeKepatuhan({ status }: { status: string }) {
  const tidakPatuh = status === "tidak_patuh";
  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
        tidakPatuh ? "bg-clay-600/10 text-clay-700" : "bg-teal-700/10 text-teal-700"
      }`}
    >
      {tidakPatuh ? "Tidak Patuh" : "Patuh"}
    </span>
  );
}

function TombolBatal({ onBatal }: { onBatal: () => Promise<void> }) {
  const [pending, mulaiTransisi] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => mulaiTransisi(() => onBatal())}
      className="text-xs font-medium text-clay-700 underline decoration-clay-700/30 underline-offset-2 disabled:opacity-50"
    >
      {pending ? "Membatalkan..." : "Batalkan"}
    </button>
  );
}

function FormPosbindu({ posyanduOpsi }: { posyanduOpsi: PosyanduOpsi[] }) {
  const [state, formAction] = useFormState(tambahKegiatanPosbinduAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state?.sukses) {
      formRef.current?.reset();
      setFormKey((k) => k + 1);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 rounded-card border border-sand-100 bg-white p-4 sm:grid-cols-3">
      <p className="text-sm font-bold text-ink sm:col-span-3">Catat Kegiatan Posbindu PTM</p>

      <PilihPasienRingkas formKey={formKey} />

      <div className="space-y-1.5">
        <label htmlFor="pb_tanggal" className={labelCls}>
          Tanggal
        </label>
        <input id="pb_tanggal" name="tanggal" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pb_posyandu" className={labelCls}>
          Posyandu (opsional)
        </label>
        <select id="pb_posyandu" name="posyandu_id" defaultValue="" className={inputCls}>
          <option value="">— Di Puskesmas —</option>
          {posyanduOpsi.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pb_hasil" className={labelCls}>
          Hasil skrining
        </label>
        <select id="pb_hasil" name="hasil_skrining" defaultValue="normal" className={inputCls}>
          <option value="normal">Normal</option>
          <option value="perlu_rujukan">Perlu Rujukan</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pb_bb" className={labelCls}>
          Berat badan (kg)
        </label>
        <input id="pb_bb" name="berat_badan" type="number" step="0.1" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pb_tb" className={labelCls}>
          Tinggi badan (cm)
        </label>
        <input id="pb_tb" name="tinggi_badan" type="number" step="0.1" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pb_lp" className={labelCls}>
          Lingkar perut (cm)
        </label>
        <input id="pb_lp" name="lingkar_perut" type="number" step="0.1" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pb_sistolik" className={labelCls}>
          Tekanan darah sistolik
        </label>
        <input id="pb_sistolik" name="td_sistolik" type="number" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pb_diastolik" className={labelCls}>
          Tekanan darah diastolik
        </label>
        <input id="pb_diastolik" name="td_diastolik" type="number" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pb_gds" className={labelCls}>
          Gula darah sewaktu
        </label>
        <input id="pb_gds" name="gula_darah_sewaktu" type="number" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pb_kolesterol" className={labelCls}>
          Kolesterol total
        </label>
        <input id="pb_kolesterol" name="kolesterol_total" type="number" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pb_asamurat" className={labelCls}>
          Asam urat
        </label>
        <input id="pb_asamurat" name="asam_urat" type="number" step="0.1" className={inputCls} />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="pb_faktor" className={labelCls}>
          Faktor risiko (mis. merokok, kurang aktivitas fisik)
        </label>
        <input id="pb_faktor" name="faktor_risiko" className={inputCls} />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="pb_tindaklanjut" className={labelCls}>
          Tindak lanjut
        </label>
        <textarea id="pb_tindaklanjut" name="tindak_lanjut" rows={2} className={inputCls} />
      </div>

      <Pesan state={state} />
      <div className="sm:col-span-3">
        <TombolSimpan label="Simpan Kegiatan" />
      </div>
    </form>
  );
}

function FormProlanis() {
  const [state, formAction] = useFormState(tambahKontrolProlanisAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state?.sukses) {
      formRef.current?.reset();
      setFormKey((k) => k + 1);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 rounded-card border border-sand-100 bg-white p-4 sm:grid-cols-3">
      <p className="text-sm font-bold text-ink sm:col-span-3">Catat Kontrol Prolanis</p>

      <PilihPasienRingkas formKey={formKey} />

      <div className="space-y-1.5">
        <label htmlFor="pr_tanggal" className={labelCls}>
          Tanggal kontrol
        </label>
        <input
          id="pr_tanggal"
          name="tanggal_kontrol"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pr_jenis" className={labelCls}>
          Jenis penyakit
        </label>
        <select id="pr_jenis" name="jenis_penyakit" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            Pilih jenis...
          </option>
          <option value="hipertensi">Hipertensi</option>
          <option value="diabetes_melitus">Diabetes Melitus</option>
          <option value="keduanya">Hipertensi & Diabetes</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pr_kepatuhan" className={labelCls}>
          Kepatuhan minum obat
        </label>
        <select id="pr_kepatuhan" name="kepatuhan_obat" defaultValue="patuh" className={inputCls}>
          <option value="patuh">Patuh</option>
          <option value="tidak_patuh">Tidak Patuh</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pr_sistolik" className={labelCls}>
          Tekanan darah sistolik
        </label>
        <input id="pr_sistolik" name="td_sistolik" type="number" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pr_diastolik" className={labelCls}>
          Tekanan darah diastolik
        </label>
        <input id="pr_diastolik" name="td_diastolik" type="number" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pr_gdp" className={labelCls}>
          Gula darah puasa
        </label>
        <input id="pr_gdp" name="gula_darah_puasa" type="number" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pr_gds" className={labelCls}>
          Gula darah sewaktu
        </label>
        <input id="pr_gds" name="gula_darah_sewaktu" type="number" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pr_bb" className={labelCls}>
          Berat badan (kg)
        </label>
        <input id="pr_bb" name="berat_badan" type="number" step="0.1" className={inputCls} />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="pr_obat" className={labelCls}>
          Obat diberikan
        </label>
        <input id="pr_obat" name="obat_diberikan" className={inputCls} />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="pr_keluhan" className={labelCls}>
          Keluhan
        </label>
        <textarea id="pr_keluhan" name="keluhan" rows={2} className={inputCls} />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="pr_tindaklanjut" className={labelCls}>
          Tindak lanjut
        </label>
        <textarea id="pr_tindaklanjut" name="tindak_lanjut" rows={2} className={inputCls} />
      </div>

      <Pesan state={state} />
      <div className="sm:col-span-3">
        <TombolSimpan label="Simpan Kontrol" />
      </div>
    </form>
  );
}

export default function TabPosbindu({
  posyanduOpsi,
  posbindu,
  prolanis,
}: {
  posyanduOpsi: PosyanduOpsi[];
  posbindu: BarisPosbindu[];
  prolanis: BarisProlanis[];
}) {
  const [tabAktif, setTabAktif] = useState<"posbindu" | "prolanis">("posbindu");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-sand-100 pb-3">
        {[
          { id: "posbindu" as const, label: `Kegiatan Posbindu PTM (${posbindu.length})` },
          { id: "prolanis" as const, label: `Kontrol Prolanis (${prolanis.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTabAktif(tab.id)}
            className={`rounded-sm px-3.5 py-2 text-sm font-medium ${
              tabAktif === tab.id ? "bg-teal-700 text-white" : "text-ink/60 hover:bg-sand-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabAktif === "posbindu" ? (
        <div className="space-y-4">
          <FormPosbindu posyanduOpsi={posyanduOpsi} />

          <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                  <th className="px-4 py-2.5 font-medium">Tanggal</th>
                  <th className="px-4 py-2.5 font-medium">Pasien</th>
                  <th className="px-4 py-2.5 font-medium">Posyandu</th>
                  <th className="px-4 py-2.5 font-medium">TD</th>
                  <th className="px-4 py-2.5 font-medium">GDS</th>
                  <th className="px-4 py-2.5 font-medium">Hasil</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {posbindu.map((p) => (
                  <tr key={p.id} className="border-b border-sand-100/70 last:border-0">
                    <td className="px-4 py-2.5 text-ink/70">{tanggalPendek(p.tanggal)}</td>
                    <td className="px-4 py-2.5 text-ink">
                      {p.namaPasien}
                      <span className="block text-xs text-ink/45">RM {p.noRm}</span>
                    </td>
                    <td className="px-4 py-2.5 text-ink/70">{p.namaPosyandu ?? "Puskesmas"}</td>
                    <td className="px-4 py-2.5 text-ink/70">
                      {p.tdSistolik != null && p.tdDiastolik != null ? `${p.tdSistolik}/${p.tdDiastolik}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-ink/70">{p.gulaDarahSewaktu ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <BadgeSkrining status={p.hasilSkrining} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <TombolBatal onBatal={() => batalkanKegiatanPosbinduAction(p.id)} />
                    </td>
                  </tr>
                ))}
                {posbindu.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-ink/45">
                      Belum ada kegiatan Posbindu PTM tercatat.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <FormProlanis />

          <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                  <th className="px-4 py-2.5 font-medium">Tanggal</th>
                  <th className="px-4 py-2.5 font-medium">Pasien</th>
                  <th className="px-4 py-2.5 font-medium">Jenis</th>
                  <th className="px-4 py-2.5 font-medium">TD</th>
                  <th className="px-4 py-2.5 font-medium">GDP / GDS</th>
                  <th className="px-4 py-2.5 font-medium">Kepatuhan</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {prolanis.map((p) => (
                  <tr key={p.id} className="border-b border-sand-100/70 last:border-0">
                    <td className="px-4 py-2.5 text-ink/70">{tanggalPendek(p.tanggalKontrol)}</td>
                    <td className="px-4 py-2.5 text-ink">
                      {p.namaPasien}
                      <span className="block text-xs text-ink/45">RM {p.noRm}</span>
                    </td>
                    <td className="px-4 py-2.5 text-ink/70">{LABEL_PENYAKIT[p.jenisPenyakit] ?? p.jenisPenyakit}</td>
                    <td className="px-4 py-2.5 text-ink/70">
                      {p.tdSistolik != null && p.tdDiastolik != null ? `${p.tdSistolik}/${p.tdDiastolik}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-ink/70">
                      {p.gulaDarahPuasa ?? "—"} / {p.gulaDarahSewaktu ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <BadgeKepatuhan status={p.kepatuhanObat} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <TombolBatal onBatal={() => batalkanKontrolProlanisAction(p.id)} />
                    </td>
                  </tr>
                ))}
                {prolanis.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-ink/45">
                      Belum ada kontrol Prolanis tercatat.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
