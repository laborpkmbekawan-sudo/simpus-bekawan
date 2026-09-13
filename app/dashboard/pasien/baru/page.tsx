import Link from "next/link";
import FormTambahPasien from "./form-tambah-pasien";

export default function HalamanTambahPasien() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/pasien"
          className="text-sm font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
        >
          ← Kembali ke Data Pasien
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold text-ink">Pasien Baru</h1>
        <p className="mt-1 text-sm text-ink/60">
          No. RM dibuat otomatis oleh sistem setelah data disimpan.
        </p>
      </div>

      <FormTambahPasien />
    </div>
  );
}
