import { getPegawaiSaya, createClient } from "@/lib/supabase/server";
import FormGantiPassword from "./form-ganti-password";

const LABEL_PERAN: Record<string, string> = {
  admin: "Admin",
  kapus: "Kepala Puskesmas",
  bendahara_bok: "Bendahara BOK",
  manajemen: "Manajemen",
  dokter: "Dokter",
  dokter_gigi: "Dokter Gigi",
  perawat: "Perawat",
  bidan: "Bidan",
  farmasi: "Farmasi",
  laboratorium: "Laboratorium",
  tenaga_gizi: "Tenaga Gizi",
  kesling: "Kesehatan Lingkungan",
  promkes: "Promosi Kesehatan",
  loket_rm_kasir: "Loket / RM / Kasir",
};

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="flex items-center justify-between border-b border-sand-100 py-3 text-sm last:border-0">
      <span className="text-ink/50">{label}</span>
      <span className="font-medium text-ink">{nilai || "—"}</span>
    </div>
  );
}

export default async function HalamanPengaturanAkun() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return null;

  const supabase = createClient();
  const { data: pegawai } = await supabase
    .from("pegawai")
    .select("nama_lengkap, nip, jabatan, unit_kerja, nomor_hp, peran, lokasi:lokasi_id (nama)")
    .eq("id", pemanggil.id)
    .single();

  const lokasiNama = (pegawai?.lokasi as unknown as { nama: string } | null)?.nama ?? "";

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Pengaturan Akun</h1>
        <p className="mt-1.5 text-sm text-ink/60">Profil dan keamanan akun login kamu sendiri.</p>
      </div>

      <div className="rounded-card border border-sand-100 bg-white p-5">
        <h2 className="mb-2 text-base font-bold text-ink">Profil</h2>
        <p className="mb-3 text-xs text-ink/45">
          Data ini cuma bisa diubah admin lewat menu Data Pegawai.
        </p>
        <Baris label="Nama lengkap" nilai={pegawai?.nama_lengkap ?? ""} />
        <Baris label="NIP" nilai={pegawai?.nip ?? ""} />
        <Baris label="Jabatan" nilai={pegawai?.jabatan ?? ""} />
        <Baris label="Unit kerja" nilai={pegawai?.unit_kerja ?? ""} />
        <Baris label="Lokasi kerja" nilai={lokasiNama} />
        <Baris label="Nomor HP" nilai={pegawai?.nomor_hp ?? ""} />
        <Baris label="Peran" nilai={LABEL_PERAN[pegawai?.peran ?? ""] ?? pegawai?.peran ?? ""} />
      </div>

      <div className="rounded-card border border-sand-100 bg-white p-5">
        <h2 className="mb-2 text-base font-bold text-ink">Ganti Password</h2>
        <p className="mb-3 text-xs text-ink/45">Minimal 6 karakter. Kamu akan tetap login setelah ganti.</p>
        <FormGantiPassword />
      </div>
    </div>
  );
}
