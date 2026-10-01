"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahLotAction } from "../actions";

export type OpsiBhpLot = { id: string; label: string };

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3 py-2 text-sm";
const labelCls = "text-xs font-bold text-ink/70";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan lot"}
    </button>
  );
}

export default function FormTambahLot({ daftarBhp, hariIni }: { daftarBhp: OpsiBhpLot[]; hariIni: string }) {
  const [state, aksi] = useFormState(tambahLotAction, null);
  const [terbuka, setTerbuka] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) {
      formRef.current?.reset();
      setTerbuka(false);
    }
  }, [state]);

  return (
    <div className="rounded-card border border-sand-100 bg-white p-5">
      <button type="button" onClick={() => setTerbuka((t) => !t)} className="text-sm font-bold text-teal-700">
        {terbuka ? "− Tutup form" : "+ Catat lot reagen baru"}
      </button>
      {state?.pesan && (
        <p role={state.sukses ? "status" : "alert"} className={`mt-2 text-sm ${state.sukses ? "text-teal-700" : "text-clay-700"}`}>
          {state.pesan}
        </p>
      )}
      {terbuka && (
        <form ref={formRef} action={aksi} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 sm:col-span-2">
              <span className={labelCls}>Reagen / BHP</span>
              <select name="bhp_id" required defaultValue="" className={inputCls}>
                <option value="" disabled>
                  Pilih dari master BHP
                </option>
                {daftarBhp.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className={labelCls}>No. lot</span>
              <input name="no_lot" required className={inputCls} />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Tanggal kadaluarsa</span>
              <input name="tanggal_kadaluarsa" type="date" required className={inputCls} />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Tanggal terima</span>
              <input name="tanggal_terima" type="date" defaultValue={hariIni} className={inputCls} />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Jumlah diterima (opsional)</span>
              <input name="jumlah_diterima" inputMode="decimal" className={inputCls} />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Stabilitas setelah dibuka (hari)</span>
              <input name="stabilitas_hari" inputMode="numeric" className={inputCls} placeholder="kosong = ikut kadaluarsa kemasan" />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className={labelCls}>Catatan (opsional)</span>
              <input name="catatan" className={inputCls} placeholder="mis. suhu simpan 2-8°C" />
            </label>
          </div>
          <p className="text-xs text-ink/50">
            Register ini cuma mencatat lot dan kadaluarsa. Stok tetap diurus di Farmasi &gt; BHP (otomatis terpotong saat
            hasil divalidasi).
          </p>
          <Tombol />
        </form>
      )}
    </div>
  );
}
