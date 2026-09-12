"use client";

import { useFormState, useFormStatus } from "react-dom";
import { ubahPegawaiAction } from "../../actions";
import PilihAksesKlaster from "../../pilih-akses-klaster";

const PILIHAN_PERAN = [
  { value: "admin", label: "Admin" },
  { value: "kapus", label: "Kepala Puskesmas" },
  { value: "bendahara_bok", label: "Bendahara BOK" },
  { value: "manajemen", label: "Manajemen (Klaster 1)" },
  { value: "dokter", label: "Dokter" },
  { value: "dokter_gigi", label: "Dokter Gigi" },
  { value: "perawat", label: "Perawat" },
  { value: "bidan", label: "Bidan" },
  { value: "farmasi", label: "Farmasi" },
  { value: "laboratorium", label: "Laboratorium" },
  { value: "tenaga_gizi", label: "Tenaga Gizi" },
  { value: "kesling", label: "Kesehatan Lingkungan" },
  { value: "promkes", label: "Promosi Kesehatan" },
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
      {pending ? "Menyimpan..." : "Simpan perubahan"}
    </button>
  );
}

type Pegawai = {
  id: string;
  nama_lengkap: string;
  jabatan: string | null;
  unit_kerja: string | null;
  peran: string;
  lokasi_id: string | null;
};

export default function FormEditPegawai({
  pegawai,
  daftarKlaster,
  daftarLokasi,
  aksesAwal,
}: {
  pegawai: Pegawai;
  daftarKlaster: { id: string; nama: string; kelompok: string }[];
  daftarLokasi: { id: string; nama: string }[];
  aksesAwal: { klaster_id: string; level_akses: "layanan" | "penuh" }[];
}) {
  const [state, formAction] = useFormState(ubahPegawaiAction, null);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-sm border border-teal-900/10 bg-white p-6 sm:grid-cols-2"
    >
      <input type="hidden" name="pegawai_id" value={pegawai.id} />

      <div className="space-y-1.5">
        <label htmlFor="nama_lengkap" className="text-sm font-medium text-ink">
          Nama lengkap
        </label>
        <input
          id="nama_lengkap"
          name="nama_lengkap"
          required
          defaultValue={pegawai.nama_lengkap}
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
          defaultValue={pegawai.jabatan ?? ""}
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
          defaultValue={pegawai.unit_kerja ?? ""}
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
          defaultValue={pegawai.peran}
          className="w-full rounded-sm border border-teal-900/20 bg-white px-3 py-2 text-sm"
        >
          {PILIHAN_PERAN.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor="lokasi_id" className="text-sm font-medium text-ink">
          Lokasi kerja
        </label>
        <select
          id="lokasi_id"
          name="lokasi_id"
          defaultValue={pegawai.lokasi_id ?? ""}
          className="w-full max-w-xs rounded-sm border border-teal-900/20 bg-white px-3 py-2 text-sm"
        >
          <option value="">Belum ditentukan</option>
          {daftarLokasi.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nama}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <PilihAksesKlaster daftarKlaster={daftarKlaster} aksesAwal={aksesAwal} />
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
