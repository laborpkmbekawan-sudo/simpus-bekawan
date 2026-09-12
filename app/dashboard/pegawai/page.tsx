import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import FormTambahPegawai from "./form-tambah";
import TabelPegawai from "./tabel-pegawai";

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

export default async function HalamanPegawai() {
  const pemanggil = await getPegawaiSaya();
  const isAdmin = pemanggil?.peran === "admin";
  const bolehLihat = isAdmin || pemanggil?.peran === "kapus";

  if (!bolehLihat) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin dan Kepala Puskesmas. Hubungi admin sistem jika butuh akses.
      </div>
    );
  }

  const supabase = createClient();

  // Jalankan semua query sekaligus (paralel), bukan satu-satu berurutan --
  // ini yang bikin halaman kerasa lebih cepat dibuka.
  const [{ data: daftarPegawaiMentah }, { data: daftarKlaster }, { data: daftarLokasi }, { data: semuaAksesKlaster }] =
    await Promise.all([
      supabase
        .from("pegawai")
        .select("*, lokasi:lokasi_id (nama)")
        .order("nama_lengkap", { ascending: true }),
      supabase.from("klaster").select("id, nama, kelompok").order("urutan", { ascending: true }),
      supabase.from("lokasi").select("id, nama").order("urutan", { ascending: true }),
      supabase.from("akses_klaster").select("pegawai_id, level_akses, klaster:klaster_id (nama)"),
    ]);

  const aksesPerPegawai = new Map<string, { nama: string; level: string }[]>();
  for (const a of semuaAksesKlaster ?? []) {
    const daftar = aksesPerPegawai.get(a.pegawai_id) ?? [];
    const namaKlaster = (a.klaster as unknown as { nama: string } | null)?.nama ?? "—";
    daftar.push({ nama: namaKlaster, level: a.level_akses });
    aksesPerPegawai.set(a.pegawai_id, daftar);
  }

  const daftarPegawai = (daftarPegawaiMentah ?? []).map((p) => ({
    id: p.id as string,
    nama_lengkap: p.nama_lengkap as string,
    jabatan: p.jabatan as string | null,
    unit_kerja: p.unit_kerja as string | null,
    peran: p.peran as string,
    status_aktif: p.status_aktif as boolean,
    lokasiNama: (p.lokasi as unknown as { nama: string } | null)?.nama ?? "",
    peranLabel: LABEL_PERAN[p.peran as string] ?? (p.peran as string),
    akses: aksesPerPegawai.get(p.id as string) ?? [],
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Data Pegawai</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Kelola akun login dan hak akses seluruh pegawai puskesmas.
        </p>
      </div>

      {isAdmin && (
        <FormTambahPegawai daftarKlaster={daftarKlaster ?? []} daftarLokasi={daftarLokasi ?? []} />
      )}

      <TabelPegawai daftarPegawai={daftarPegawai} isAdmin={isAdmin} />
    </div>
  );
}
