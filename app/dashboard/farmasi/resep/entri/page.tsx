import { createClient, getPegawaiSaya, getKodeAksesSaya, punyaAkses } from "@/lib/supabase/server";
import FormEntriResep from "./form-entri-resep";

export default async function HalamanEntriResep() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !["admin", "farmasi"].includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus farmasi/admin.
      </div>
    );
  }
  const kodeAkses = await getKodeAksesSaya(pemanggil.id, pemanggil.peran);
  if (!punyaAkses(kodeAkses, "lintas_farmasi")) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Akunmu belum dikasih akses ke Farmasi. Minta admin nambahin akses klaster
        &quot;Lintas Klaster - Farmasi&quot; di halaman Data Pegawai.
      </div>
    );
  }

  const supabase = createClient();
  const hariIni = new Date().toISOString().slice(0, 10);

  const [{ data: kunjunganMentah }, { data: obatMentah }] = await Promise.all([
    supabase
      .from("kunjungan")
      .select("id, nomor_antrian, pasien:pasien_id (nama_lengkap, no_rm), klaster:klaster_tujuan_id (nama, kode_antrian)")
      .eq("tanggal", hariIni)
      .order("nomor_antrian", { ascending: true }),
    supabase.from("obat").select("id, nama_obat, satuan, stok_saat_ini").eq("aktif", true).order("nama_obat"),
  ]);

  const daftarKunjungan = (kunjunganMentah ?? []).map((k) => {
    const pasien = k.pasien as unknown as { nama_lengkap: string; no_rm: string } | null;
    const klaster = k.klaster as unknown as { nama: string; kode_antrian: string | null } | null;
    return {
      id: k.id as string,
      label: `${klaster?.kode_antrian ?? ""}${k.nomor_antrian ?? ""} — ${pasien?.nama_lengkap ?? "Pasien"} (${
        pasien?.no_rm ?? "-"
      })`,
    };
  });

  const daftarObat = (obatMentah ?? []) as unknown as { id: string; nama_obat: string; satuan: string; stok_saat_ini: number }[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Entri Resep Manual</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Sementara resep dicatat manual di sini oleh farmasi. Integrasi otomatis dari halaman Pelayanan (dokter)
          nyusul.
        </p>
      </div>

      <FormEntriResep daftarKunjungan={daftarKunjungan} daftarObat={daftarObat} />
    </div>
  );
}
