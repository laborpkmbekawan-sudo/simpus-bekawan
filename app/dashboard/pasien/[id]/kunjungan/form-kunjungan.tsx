"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
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
  jenisPenjaminDefault = "umum",
}: {
  pasienId: string;
  daftarKlaster: { id: string; nama: string }[];
  jenisPenjaminDefault?: string;
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
        <p className="mt-2 text-5xl font-extrabold text-ink">{state.nomorTampil}</p>
        <p className="mt-1 text-sm text-ink/60">Nomor antrian menuju {state.namaKlaster}</p>
        {state.pesan?.includes("gagal disimpan") && (
          <p className="mx-auto mt-3 max-w-sm rounded-sm bg-clay-600/10 px-3.5 py-2 text-xs text-clay-700">
            {state.pesan}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => window.location.reload()}
            className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900"
          >
            Daftarkan kunjungan lain
          </button>
          <Link
            href="/dashboard/pasien"
            className="text-sm font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
          >
            Kembali ke Daftar Pasien
          </Link>
        </div>
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
        <label htmlFor="jenis_penjamin" className="text-sm font-bold text-ink/80">
          Penjamin kunjungan ini
        </label>
        <select
          id="jenis_penjamin"
          name="jenis_penjamin"
          required
          defaultValue={jenisPenjaminDefault === "bpjs" ? "bpjs" : "umum"}
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        >
          <option value="umum">Umum</option>
          <option value="bpjs">BPJS</option>
        </select>
        <p className="text-xs text-ink/50">
          Cek dulu status BPJS di PCare -- kalau lagi tidak aktif bulan ini, pilih Umum di sini
          walau data pasien tercatat BPJS.
        </p>
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
        <div className="mt-2 border-t border-sand-100 pt-4">
          <p className="text-sm font-bold text-ink">Skrining Awal / Anamnesis</p>
          <p className="mt-0.5 text-xs text-ink/50">
            Diisi petugas skrining sebelum pasien masuk ke klaster tujuan.
          </p>
        </div>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor="keluhan_utama" className="text-sm font-bold text-ink/80">
          Keluhan utama
        </label>
        <textarea
          id="keluhan_utama"
          name="keluhan_utama"
          rows={2}
          placeholder="Keluhan yang disampaikan pasien..."
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-ink/80">Tekanan darah (mmHg)</label>
        <div className="flex items-center gap-2">
          <input
            name="td_sistolik"
            type="number"
            placeholder="120"
            className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
          />
          <span className="text-ink/40">/</span>
          <input
            name="td_diastolik"
            type="number"
            placeholder="80"
            className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="berat_badan" className="text-sm font-bold text-ink/80">
            Berat badan (kg)
          </label>
          <input
            id="berat_badan"
            name="berat_badan"
            type="number"
            step="0.1"
            placeholder="contoh: 58.5"
            className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="tinggi_badan" className="text-sm font-bold text-ink/80">
            Tinggi badan (cm)
          </label>
          <input
            id="tinggi_badan"
            name="tinggi_badan"
            type="number"
            step="0.1"
            placeholder="contoh: 160"
            className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="nadi" className="text-sm font-bold text-ink/80">
            Nadi
          </label>
          <input
            id="nadi"
            name="nadi"
            type="number"
            placeholder="/menit"
            className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="suhu" className="text-sm font-bold text-ink/80">
            Suhu (°C)
          </label>
          <input
            id="suhu"
            name="suhu"
            type="number"
            step="0.1"
            placeholder="36.5"
            className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="frekuensi_napas" className="text-sm font-bold text-ink/80">
            Napas
          </label>
          <input
            id="frekuensi_napas"
            name="frekuensi_napas"
            type="number"
            placeholder="/menit"
            className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor="prioritas_triase" className="text-sm font-bold text-ink/80">
          Prioritas triase
        </label>
        <div className="flex gap-2">
          {[
            { value: "hijau", label: "Hijau · Tidak darurat", warna: "border-teal-700/40 has-[:checked]:bg-teal-700/10" },
            { value: "kuning", label: "Kuning · Perlu perhatian", warna: "border-clay-600/40 has-[:checked]:bg-clay-600/10" },
            { value: "merah", label: "Merah · Gawat darurat", warna: "border-red-500/40 has-[:checked]:bg-red-500/10" },
          ].map((opsi) => (
            <label
              key={opsi.value}
              className={`flex-1 cursor-pointer rounded-sm border px-3 py-2.5 text-center text-xs font-medium text-ink/70 ${opsi.warna}`}
            >
              <input
                type="radio"
                name="prioritas_triase"
                value={opsi.value}
                defaultChecked={opsi.value === "hijau"}
                className="sr-only"
              />
              {opsi.label}
            </label>
          ))}
        </div>
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
