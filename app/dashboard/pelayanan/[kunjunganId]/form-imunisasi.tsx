"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { batalkanImunisasiAction, catatImunisasiAction } from "./actions";

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
      {pending ? "Menyimpan..." : "Catat Imunisasi"}
    </button>
  );
}

export type ImunisasiTercatat = {
  id: string;
  jenis_vaksin: string;
  tanggal_pemberian: string;
  nomor_batch: string | null;
  reaksi_kipi: string | null;
  jadwal_berikutnya: string | null;
};

export default function FormImunisasi({
  kunjunganId,
  pasienId,
  riwayat,
}: {
  kunjunganId: string;
  pasienId: string;
  riwayat: ImunisasiTercatat[];
}) {
  const [state, formAction] = useFormState(catatImunisasiAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-5">
      <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <input type="hidden" name="kunjungan_id" value={kunjunganId} />
        <input type="hidden" name="pasien_id" value={pasienId} />

        <div className="space-y-1.5">
          <label htmlFor="jenis_vaksin" className={labelCls}>
            Jenis vaksin
          </label>
          <input
            id="jenis_vaksin"
            name="jenis_vaksin"
            required
            placeholder="contoh: DPT-HB-Hib, MR, Polio, BCG"
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="dosis" className={labelCls}>
            Dosis
          </label>
          <input id="dosis" name="dosis" placeholder="contoh: 0.5 ml, Dosis 1" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="rute" className={labelCls}>
            Rute
          </label>
          <select id="rute" name="rute" defaultValue="" className={inputCls}>
            <option value="">— Pilih —</option>
            <option value="IM">IM (intramuskular)</option>
            <option value="SC">SC (subkutan)</option>
            <option value="ID">ID (intradermal)</option>
            <option value="Oral">Oral</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="tanggal_pemberian" className={labelCls}>
            Tanggal pemberian
          </label>
          <input
            id="tanggal_pemberian"
            name="tanggal_pemberian"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="nomor_batch" className={labelCls}>
            Nomor batch
          </label>
          <input id="nomor_batch" name="nomor_batch" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="tanggal_kedaluwarsa" className={labelCls}>
            Tanggal kedaluwarsa vaksin
          </label>
          <input id="tanggal_kedaluwarsa" name="tanggal_kedaluwarsa" type="date" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reaksi_kipi" className={labelCls}>
            Reaksi / KIPI
          </label>
          <input id="reaksi_kipi" name="reaksi_kipi" placeholder="contoh: Tidak ada" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="jadwal_berikutnya" className={labelCls}>
            Jadwal berikutnya
          </label>
          <input id="jadwal_berikutnya" name="jadwal_berikutnya" type="date" className={inputCls} />
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
        <p className="mb-2 text-sm font-bold text-ink">Riwayat Imunisasi Pasien</p>
        <div className="space-y-2">
          {riwayat.map((r) => (
            <div key={r.id} className="rounded-sm border border-sand-100 bg-white p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">
                  {r.jenis_vaksin} <span className="font-normal text-ink/50">— {r.tanggal_pemberian}</span>
                </p>
                <button
                  onClick={() => batalkanImunisasiAction(r.id, kunjunganId)}
                  className="text-xs font-medium text-clay-700 underline decoration-clay-700/30 underline-offset-2"
                >
                  Batalkan
                </button>
              </div>
              <p className="mt-1 text-xs text-ink/50">
                {[
                  r.nomor_batch ? `Batch ${r.nomor_batch}` : null,
                  r.reaksi_kipi ? `KIPI: ${r.reaksi_kipi}` : null,
                  r.jadwal_berikutnya ? `Jadwal berikutnya: ${r.jadwal_berikutnya}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          ))}
          {riwayat.length === 0 && (
            <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/45">
              Belum ada riwayat imunisasi.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
