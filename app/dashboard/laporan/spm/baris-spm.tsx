"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { simpanSpmAction } from "./actions";

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

export default function BarisSpm({
  bulan,
  tahun,
  kode,
  nama,
  capaian,
  target,
  catatan,
}: {
  bulan: number;
  tahun: number;
  kode: string;
  nama: string;
  capaian: number | null;
  target: number | null;
  catatan: string | null;
}) {
  const [state, formAction] = useFormState(simpanSpmAction, null);
  const [tersimpan, setTersimpan] = useState(false);

  useEffect(() => {
    if (state?.sukses) {
      setTersimpan(true);
      const t = setTimeout(() => setTersimpan(false), 2000);
      return () => clearTimeout(t);
    }
  }, [state]);

  const persen = target && target > 0 && capaian !== null ? Math.round(((capaian ?? 0) / target) * 1000) / 10 : null;

  return (
    <form action={formAction} className="grid grid-cols-12 items-end gap-2 border-b border-sand-100 py-3 last:border-0">
      <input type="hidden" name="bulan" value={bulan} />
      <input type="hidden" name="tahun" value={tahun} />
      <input type="hidden" name="kode_indikator" value={kode} />
      <input type="hidden" name="nama_indikator" value={nama} />

      <div className="col-span-5 text-sm">
        <p className="font-semibold text-ink">{nama}</p>
        <p className="text-xs text-ink/40 print:hidden">{kode}</p>
      </div>
      <div className="col-span-2 print:hidden">
        <label className="mb-0.5 block text-[10px] text-ink/45">Capaian</label>
        <input name="jumlah_capaian" type="number" step="any" defaultValue={capaian ?? ""} className={inputCls} />
      </div>
      <div className="col-span-2 print:hidden">
        <label className="mb-0.5 block text-[10px] text-ink/45">Target</label>
        <input name="jumlah_target" type="number" step="any" defaultValue={target ?? ""} className={inputCls} />
      </div>
      <div className="hidden text-sm text-ink print:block">Capaian: {capaian ?? "—"}</div>
      <div className="hidden text-sm text-ink print:block">Target: {target ?? "—"}</div>
      <div className="col-span-1 text-center text-sm font-semibold text-ink/70">
        {persen !== null ? `${persen}%` : "—"}
      </div>
      <div className="col-span-1 print:hidden">
        <TombolSimpan />
      </div>
      <div className="col-span-1 print:hidden">{tersimpan && <span className="text-xs text-teal-700">Tersimpan</span>}</div>

      <div className="col-span-12 print:hidden">
        <label className="mb-0.5 block text-[10px] text-ink/45">Catatan (opsional)</label>
        <input name="catatan" defaultValue={catatan ?? ""} className={inputCls} placeholder="mis. sumber data, kendala" />
      </div>
      {catatan && <p className="hidden text-xs text-ink/60 print:block">Catatan: {catatan}</p>}
      {state?.pesan && !state.sukses && <p className="col-span-12 text-xs text-clay-700">{state.pesan}</p>}
    </form>
  );
}
