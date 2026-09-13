"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahPasienAction } from "../actions";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Pasien Baru"}
    </button>
  );
}

export default function FormTambahPasien() {
  const [state, formAction] = useFormState(tambahPasienAction, null);
  const [jenisPenjamin, setJenisPenjamin] = useState<"umum" | "bpjs">("umum");

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-card border border-sand-100 bg-white p-6 sm:grid-cols-2"
    >
      <div className="space-y-1.5">
        <label htmlFor="nik" className="text-sm font-bold text-ink/80">
          NIK
        </label>
        <input
          id="nik"
          name="nik"
          inputMode="numeric"
          maxLength={16}
          placeholder="16 digit, kosongkan jika belum ada"
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="nama_lengkap" className="text-sm font-bold text-ink/80">
          Nama lengkap
        </label>
        <input
          id="nama_lengkap"
          name="nama_lengkap"
          required
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="tanggal_lahir" className="text-sm font-bold text-ink/80">
          Tanggal lahir
        </label>
        <input
          id="tanggal_lahir"
          name="tanggal_lahir"
          type="date"
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="jenis_kelamin" className="text-sm font-bold text-ink/80">
          Jenis kelamin
        </label>
        <select
          id="jenis_kelamin"
          name="jenis_kelamin"
          defaultValue=""
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        >
          <option value="">Pilih</option>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="jenis_penjamin" className="text-sm font-bold text-ink/80">
          Penjamin
        </label>
        <select
          id="jenis_penjamin"
          name="jenis_penjamin"
          value={jenisPenjamin}
          onChange={(e) => setJenisPenjamin(e.target.value === "bpjs" ? "bpjs" : "umum")}
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        >
          <option value="umum">Umum</option>
          <option value="bpjs">BPJS</option>
        </select>
      </div>

      {jenisPenjamin === "bpjs" && (
        <div className="space-y-1.5">
          <label htmlFor="no_bpjs" className="text-sm font-bold text-ink/80">
            No. BPJS
          </label>
          <input
            id="no_bpjs"
            name="no_bpjs"
            inputMode="numeric"
            placeholder="13 digit nomor kartu BPJS"
            className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
          />
        </div>
      )}

      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor="alamat_jalan" className="text-sm font-bold text-ink/80">
          Jalan
        </label>
        <input
          id="alamat_jalan"
          name="alamat_jalan"
          placeholder="contoh: Jl. Merdeka No. 12"
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="alamat_desa" className="text-sm font-bold text-ink/80">
          Desa/Kelurahan
        </label>
        <input
          id="alamat_desa"
          name="alamat_desa"
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="alamat_rt" className="text-sm font-bold text-ink/80">
            RT
          </label>
          <input
            id="alamat_rt"
            name="alamat_rt"
            inputMode="numeric"
            maxLength={3}
            className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="alamat_rw" className="text-sm font-bold text-ink/80">
            RW
          </label>
          <input
            id="alamat_rw"
            name="alamat_rw"
            inputMode="numeric"
            maxLength={3}
            className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="alamat_kecamatan" className="text-sm font-bold text-ink/80">
          Kecamatan
        </label>
        <input
          id="alamat_kecamatan"
          name="alamat_kecamatan"
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="alamat_kabupaten" className="text-sm font-bold text-ink/80">
          Kabupaten/Kota
        </label>
        <input
          id="alamat_kabupaten"
          name="alamat_kabupaten"
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="no_hp" className="text-sm font-bold text-ink/80">
          No. HP
        </label>
        <input
          id="no_hp"
          name="no_hp"
          inputMode="numeric"
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="alergi" className="text-sm font-bold text-ink/80">
          Alergi <span className="font-normal text-ink/40">(opsional)</span>
        </label>
        <input
          id="alergi"
          name="alergi"
          placeholder="contoh: Penisilin"
          className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
      </div>

      <div className="sm:col-span-2">
        {state?.pesan && (
          <p role="alert" className="mb-3 rounded-sm bg-clay-600/10 px-3.5 py-2.5 text-sm text-clay-700">
            {state.pesan}
          </p>
        )}
        <TombolSimpan />
      </div>
    </form>
  );
}
