"use client";

import { useFormState, useFormStatus } from "react-dom";
import { simpanPelayananAnakAction } from "./actions";

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
      {pending ? "Menyimpan..." : "Simpan Data Anak"}
    </button>
  );
}

export type DataPelayananAnak = {
  berat_badan: number | null;
  panjang_tinggi_badan: number | null;
  lingkar_kepala: number | null;
  status_gizi: string | null;
  status_tumbuh_kembang: string | null;
  klasifikasi_mtbs: string | null;
  keluhan: string | null;
  catatan: string | null;
  rencana_tindak_lanjut: string | null;
};

export default function FormPelayananAnak({
  kunjunganId,
  data,
}: {
  kunjunganId: string;
  data: DataPelayananAnak | null;
}) {
  const [state, formAction] = useFormState(simpanPelayananAnakAction, null);
  const d = data;

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <input type="hidden" name="kunjungan_id" value={kunjunganId} />

      <div className="space-y-1.5">
        <label htmlFor="berat_badan_anak" className={labelCls}>
          Berat badan (kg)
        </label>
        <input
          id="berat_badan_anak"
          name="berat_badan"
          type="number"
          step="0.1"
          defaultValue={d?.berat_badan ?? ""}
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="panjang_tinggi_badan" className={labelCls}>
          Panjang/tinggi badan (cm)
        </label>
        <input
          id="panjang_tinggi_badan"
          name="panjang_tinggi_badan"
          type="number"
          step="0.1"
          defaultValue={d?.panjang_tinggi_badan ?? ""}
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="lingkar_kepala" className={labelCls}>
          Lingkar kepala (cm)
        </label>
        <input
          id="lingkar_kepala"
          name="lingkar_kepala"
          type="number"
          step="0.1"
          defaultValue={d?.lingkar_kepala ?? ""}
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="status_gizi" className={labelCls}>
          Status gizi
        </label>
        <select
          id="status_gizi"
          name="status_gizi"
          defaultValue={d?.status_gizi ?? ""}
          className={inputCls}
        >
          <option value="">— Belum dinilai —</option>
          <option value="gizi_buruk">Gizi buruk</option>
          <option value="gizi_kurang">Gizi kurang</option>
          <option value="gizi_baik">Gizi baik</option>
          <option value="gizi_lebih">Gizi lebih</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="status_tumbuh_kembang" className={labelCls}>
          Status tumbuh kembang
        </label>
        <select
          id="status_tumbuh_kembang"
          name="status_tumbuh_kembang"
          defaultValue={d?.status_tumbuh_kembang ?? ""}
          className={inputCls}
        >
          <option value="">— Belum dinilai —</option>
          <option value="sesuai">Sesuai</option>
          <option value="meragukan">Meragukan</option>
          <option value="penyimpangan">Penyimpangan</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="klasifikasi_mtbs" className={labelCls}>
          Klasifikasi MTBS/MTBM
        </label>
        <input
          id="klasifikasi_mtbs"
          name="klasifikasi_mtbs"
          defaultValue={d?.klasifikasi_mtbs ?? ""}
          placeholder="contoh: Diare tanpa dehidrasi"
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="keluhan_anak" className={labelCls}>
          Keluhan
        </label>
        <textarea
          id="keluhan_anak"
          name="keluhan"
          rows={2}
          defaultValue={d?.keluhan ?? ""}
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="rencana_tindak_lanjut" className={labelCls}>
          Rencana tindak lanjut
        </label>
        <textarea
          id="rencana_tindak_lanjut"
          name="rencana_tindak_lanjut"
          rows={2}
          defaultValue={d?.rencana_tindak_lanjut ?? ""}
          placeholder="contoh: Kontrol 2 minggu, rujuk stimulasi tumbuh kembang..."
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="catatan_anak" className={labelCls}>
          Catatan lain
        </label>
        <textarea
          id="catatan_anak"
          name="catatan"
          rows={2}
          defaultValue={d?.catatan ?? ""}
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
