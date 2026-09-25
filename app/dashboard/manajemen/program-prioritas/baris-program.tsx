"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { simpanProgramPrioritasAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-2.5 py-1.5 text-sm";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "..." : "Simpan"}
    </button>
  );
}

export default function BarisProgram({
  bulan,
  tahun,
  kode,
  nama,
  sasaran,
  capaian,
  catatan,
}: {
  bulan: number;
  tahun: number;
  kode: string;
  nama: string;
  sasaran: number | null;
  capaian: number | null;
  catatan: string | null;
}) {
  const [state, formAction] = useFormState(simpanProgramPrioritasAction, null);
  const [tersimpan, setTersimpan] = useState(false);

  useEffect(() => {
    if (state?.sukses) {
      setTersimpan(true);
      const t = setTimeout(() => setTersimpan(false), 2000);
      return () => clearTimeout(t);
    }
  }, [state]);

  const persen =
    sasaran && sasaran > 0 && capaian !== null ? Math.round(((capaian ?? 0) / sasaran) * 1000) / 10 : null;

  return (
    <form action={formAction} className="grid grid-cols-12 items-end gap-2 border-b border-sand-100 py-3 last:border-0">
      <input type="hidden" name="bulan" value={bulan} />
      <input type="hidden" name="tahun" value={tahun} />
      <input type="hidden" name="kode_program" value={kode} />
      <input type="hidden" name="nama_program" value={nama} />

      <div className="col-span-5 text-sm">
        <p className="font-semibold text-ink">{nama}</p>
        <p className="text-xs text-ink/40">{kode}</p>
      </div>
      <div className="col-span-2">
        <label className="mb-0.5 block text-[10px] text-ink/45">Sasaran</label>
        <input name="sasaran" type="number" step="any" defaultValue={sasaran ?? ""} className={inputCls} />
      </div>
      <div className="col-span-2">
        <label className="mb-0.5 block text-[10px] text-ink/45">Capaian</label>
        <input name="capaian" type="number" step="any" defaultValue={capaian ?? ""} className={inputCls} />
      </div>
      <div className="col-span-1 text-center text-sm font-semibold text-ink/70">
        {persen !== null ? `${persen}%` : "—"}
      </div>
      <div className="col-span-1">
        <TombolSimpan />
      </div>
      <div className="col-span-1">{tersimpan && <span className="text-xs text-teal-700">Tersimpan</span>}</div>

      <div className="col-span-12">
        <label className="mb-0.5 block text-[10px] text-ink/45">Catatan (opsional)</label>
        <input name="catatan" defaultValue={catatan ?? ""} className={inputCls} placeholder="mis. sumber data, kendala" />
      </div>
      {state?.pesan && !state.sukses && <p className="col-span-12 text-xs text-clay-700">{state.pesan}</p>}
    </form>
  );
}
