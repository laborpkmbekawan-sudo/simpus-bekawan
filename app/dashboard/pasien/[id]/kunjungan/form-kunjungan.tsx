"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { daftarKunjunganAction } from "./actions";

function TombolDaftar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Mendaftarkan..." : "Daftarkan Kunjungan"}
    </button>
  );
}

export default function FormKunjungan({
  pasienId,
  daftarKlaster,
}: {
  pasienId: string;
  daftarKlaster: { id: string; nama: string }[];
}) {
  const [state, formAction] = useFormState(daftarKunjunganAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) {
      formRef.current?.reset();
    }
  }, [state]);

  if (state?.sukses) {
    return (
      <div className="rounded-card border border-teal-700/20 bg-teal-500/10 p-8 text-center">
        <p className="text-sm font-medium text-teal-700">Berhasil didaftarkan</p>
        <p className="mt-2 text-5xl font-extrabold text-ink">{state.nomorAntrian}</p>
        <p className="mt-1 text-sm text-ink/60">Nomor antrian menuju {state.namaKlaster}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900"
        >
          Daftarkan kunjungan lain
        </button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-card border border-sand-100 bg-white p-6 sm:grid-cols-2"
    >
      <input type="hidden" name="pasien_id" value={pasienId} />

      <div className="space-y-1.5">
        <label htmlFor="jenis_kunjungan" className="text-sm font-bold text-ink/80">
          Jenis kunjungan
        </label>
        <select
          id="jenis_kunjungan"
          name="jenis_kunjungan"
          required
          defaultValue=""
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        >
          <option value="" disabled>
            Pilih jenis kunjungan
          </option>
          <option value="baru">Baru</option>
          <option value="lama">Lama</option>
          <option value="kontrol">Kontrol</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="klaster_tujuan_id" className="text-sm font-bold text-ink/80">
          Klaster tujuan
        </label>
        <select
          id="klaster_tujuan_id"
          name="klaster_tujuan_id"
          required
          defaultValue=""
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        >
          <option value="" disabled>
            Pilih klaster tujuan
          </option>
          {daftarKlaster.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        {state?.pesan && !state.sukses && (
          <p role="alert" className="mb-3 rounded-sm bg-clay-600/10 px-3.5 py-2.5 text-sm text-clay-700">
            {state.pesan}
          </p>
        )}
        <TombolDaftar />
      </div>
    </form>
  );
}
