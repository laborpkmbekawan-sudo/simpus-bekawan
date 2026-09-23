"use client";

import { useFormState, useFormStatus } from "react-dom";
import { simpanPelayananIbuAction } from "./actions";

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
      {pending ? "Menyimpan..." : "Simpan Data Ibu"}
    </button>
  );
}

export type DataPelayananIbu = {
  usia_kehamilan_minggu: number | null;
  gravida: number | null;
  para: number | null;
  abortus: number | null;
  hpht: string | null;
  hpl: string | null;
  td_sistolik: number | null;
  td_diastolik: number | null;
  berat_badan: number | null;
  lila: number | null;
  tfu: number | null;
  djj: number | null;
  status_risiko: string;
  faktor_risiko: string | null;
  catatan: string | null;
};

export default function FormPelayananIbu({
  kunjunganId,
  data,
}: {
  kunjunganId: string;
  data: DataPelayananIbu | null;
}) {
  const [state, formAction] = useFormState(simpanPelayananIbuAction, null);
  const d = data;

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <input type="hidden" name="kunjungan_id" value={kunjunganId} />

      <div className="space-y-1.5">
        <label htmlFor="usia_kehamilan_minggu" className={labelCls}>
          Usia kehamilan (minggu)
        </label>
        <input
          id="usia_kehamilan_minggu"
          name="usia_kehamilan_minggu"
          type="number"
          defaultValue={d?.usia_kehamilan_minggu ?? ""}
          placeholder="contoh: 32"
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelCls}>Gravida / Para / Abortus</label>
        <div className="flex items-center gap-1.5">
          <input name="gravida" type="number" defaultValue={d?.gravida ?? ""} placeholder="G" className={inputCls} />
          <input name="para" type="number" defaultValue={d?.para ?? ""} placeholder="P" className={inputCls} />
          <input name="abortus" type="number" defaultValue={d?.abortus ?? ""} placeholder="A" className={inputCls} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={labelCls}>Status risiko</label>
        <div className="flex gap-2">
          {[
            { value: "rendah", label: "Rendah", warna: "border-teal-700/40 has-[:checked]:bg-teal-700/10" },
            { value: "tinggi", label: "Tinggi", warna: "border-red-500/40 has-[:checked]:bg-red-500/10" },
          ].map((opsi) => (
            <label
              key={opsi.value}
              className={`flex-1 cursor-pointer rounded-sm border px-3 py-2.5 text-center text-xs font-medium text-ink/70 ${opsi.warna}`}
            >
              <input
                type="radio"
                name="status_risiko"
                value={opsi.value}
                defaultChecked={(d?.status_risiko ?? "rendah") === opsi.value}
                className="sr-only"
              />
              {opsi.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="hpht" className={labelCls}>
          HPHT
        </label>
        <input id="hpht" name="hpht" type="date" defaultValue={d?.hpht ?? ""} className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="hpl" className={labelCls}>
          HPL
        </label>
        <input id="hpl" name="hpl" type="date" defaultValue={d?.hpl ?? ""} className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label className={labelCls}>Tekanan darah (mmHg)</label>
        <div className="flex items-center gap-2">
          <input name="td_sistolik" type="number" defaultValue={d?.td_sistolik ?? ""} placeholder="120" className={inputCls} />
          <span className="text-ink/40">/</span>
          <input name="td_diastolik" type="number" defaultValue={d?.td_diastolik ?? ""} placeholder="80" className={inputCls} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="berat_badan" className={labelCls}>
          Berat badan (kg)
        </label>
        <input
          id="berat_badan"
          name="berat_badan"
          type="number"
          step="0.1"
          defaultValue={d?.berat_badan ?? ""}
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="lila" className={labelCls}>
          LILA (cm)
        </label>
        <input id="lila" name="lila" type="number" step="0.1" defaultValue={d?.lila ?? ""} className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="tfu" className={labelCls}>
          TFU (cm)
        </label>
        <input id="tfu" name="tfu" type="number" step="0.1" defaultValue={d?.tfu ?? ""} className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="djj" className={labelCls}>
          DJJ (x/menit)
        </label>
        <input id="djj" name="djj" type="number" defaultValue={d?.djj ?? ""} className={inputCls} />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor="faktor_risiko" className={labelCls}>
          Faktor risiko (bila status tinggi)
        </label>
        <input
          id="faktor_risiko"
          name="faktor_risiko"
          defaultValue={d?.faktor_risiko ?? ""}
          placeholder="contoh: Hipertensi, anemia, riwayat SC"
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="catatan_ibu" className={labelCls}>
          Catatan / tindak lanjut
        </label>
        <textarea
          id="catatan_ibu"
          name="catatan"
          rows={2}
          defaultValue={d?.catatan ?? ""}
          placeholder="Diagnosis/kesimpulan, terapi, edukasi, rencana kontrol..."
          className={inputCls}
        />
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
  );
}
