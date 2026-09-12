"use client";

import { useFormState, useFormStatus } from "react-dom";
import { tambahPegawaiAction } from "./actions";
import PilihAksesKlaster from "./pilih-akses-klaster";

const PILIHAN_PERAN = [
  { value: "admin", label: "Admin" },
  { value: "kapus", label: "Kepala Puskesmas" },
  { value: "bendahara_bok", label: "Bendahara BOK" },
  { value: "dokter", label: "Dokter" },
  { value: "perawat", label: "Perawat" },
  { value: "bidan", label: "Bidan" },
  { value: "farmasi", label: "Farmasi" },
  { value: "laboratorium", label: "Laboratorium" },
  { value: "loket_rm_kasir", label: "Loket / Rekam Medis / Kasir" },
];

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-900 px-4 py-2.5 text-sm font-semibold text-sand-50
                 hover:bg-teal-950 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Buat akun pegawai"}
    </button>
  );
}

export default function FormTambahPegawai({
  daftarKlaster,
}: {
  daftarKlaster: { id: string; nama: string; kelompok: string }[];
}) {
  const [state, formAction] = useFormState(tambahPegawaiAction, null);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-sm border border-teal-900/10 bg-white p-6 sm:grid-cols-2"
    >
      <div className="space-y-1.5">
        <label htmlFor="nama_lengkap" className="text-sm font-medium text-ink">
          Nama lengkap
        </label>
        <input
          id="nama_lengkap"
          name="nama_lengkap"
          required
          className="w-full rounded-sm border border-teal-900/20 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-ink">
          Email login
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-sm border border-teal-900/20 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="jabatan" className="text-sm font-medium text-ink">
          Jabatan
        </label>
        <input
          id="jabatan"
          name="jabatan"
          placeholder="contoh: Dokter Umum"
          className="w-full rounded-sm border border-teal-900/20 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="unit_kerja" className="text-sm font-medium text-ink">
          Unit kerja
        </label>
        <input
          id="unit_kerja"
          name="unit_kerja"
          placeholder="contoh: Poli Umum"
          className="w-full rounded-sm border border-teal-900/20 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="peran" className="text-sm font-medium text-ink">
          Hak akses
        </label>
        <select
          id="peran"
          name="peran"
          required
          defaultValue=""
          className="w-full rounded-sm border border-teal-900/20 bg-white px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Pilih hak akses
          </option>
          {PILIHAN_PERAN.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="kata_sandi_sementara" className="text-sm font-medium text-ink">
          Kata sandi sementara
        </label>
        <input
          id="kata_sandi_sementara"
          name="kata_sandi_sementara"
          type="text"
          minLength={8}
          required
          placeholder="Minimal 8 karakter"
          className="w-full rounded-sm border border-teal-900/20 px-3 py-2 text-sm"
        />
        <p className="text-xs text-ink/45">
          Sampaikan ke pegawai secara langsung, minta diganti saat login pertama.
        </p>
      </div>

      <div className="sm:col-span-2">
        <PilihAksesKlaster daftarKlaster={daftarKlaster} />
      </div>

      <div className="sm:col-span-2">
        {state?.pesan && (
          <p
            role="alert"
            className={`mb-3 rounded-sm px-3.5 py-2.5 text-sm ${
              state.sukses
                ? "bg-teal-900/8 text-teal-900"
                : "bg-clay-600/10 text-clay-700"
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
