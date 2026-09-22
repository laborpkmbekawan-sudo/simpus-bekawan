import Link from "next/link";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

const PERAN_LIHAT_SEMUA = ["admin", "kapus", "loket_rm_kasir"];
const PERAN_KASIR = ["admin", "kapus", "loket_rm_kasir"]; // melihat "belum bayar"
const PERAN_TERIMA_RUJUKAN = ["dokter", "dokter_gigi", "perawat", "bidan"];
const PERAN_FARMASI = ["admin", "farmasi"];

type Peringatan = { teks: string; href: string; gawat?: boolean };

// Embed relasi bisa balik sebagai objek atau array tergantung PostgREST.
function ada(nilai: unknown): boolean {
  return Array.isArray(nilai) ? nilai.length > 0 : !!nilai;
}
function ambilTriase(nilai: unknown): string | null {
  const baris = Array.isArray(nilai) ? nilai[0] : nilai;
  return (baris as { prioritas_triase?: string } | null | undefined)?.prioritas_triase ?? null;
}

export default async function BerandaDashboard() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return null;

  const supabase = createClient();
  // Sama dengan halaman Antrian: kolom kunjungan.tanggal diisi current_date di database.
  const hariIni = new Date().toISOString().slice(0, 10);
  const lihatSemua = PERAN_LIHAT_SEMUA.includes(pemanggil.peran);
  const lihatBelumBayar = PERAN_KASIR.includes(pemanggil.peran);
  const terimaRujukan = PERAN_TERIMA_RUJUKAN.includes(pemanggil.peran) && !!pemanggil.lokasi_id;
  const lihatStok = PERAN_FARMASI.includes(pemanggil.peran);

  const [{ data: kunjunganMentah }, { data: aksesSaya }, rujukanMasuk, bhp] = await Promise.all([
    supabase
      .from("kunjungan")
      .select("id, jenis_kunjungan, status, klaster_tujuan_id, skrining (prioritas_triase), tagihan (id)")
      .eq("tanggal", hariIni),
    lihatSemua
      ? Promise.resolve({ data: [] as { klaster_id: string }[] })
      : supabase.from("akses_klaster").select("klaster_id").eq("pegawai_id", pemanggil.id),
    terimaRujukan
      ? supabase
          .from("rujukan")
          .select("id", { count: "exact", head: true })
          .eq("jenis", "internal")
          .eq("ke_lokasi_id", pemanggil.lokasi_id)
          .eq("status", "dibuat")
      : Promise.resolve({ count: 0 }),
    lihatStok
      ? supabase.from("bhp").select("stok_saat_ini, stok_minimum").eq("aktif", true)
      : Promise.resolve({ data: [] as { stok_saat_ini: number; stok_minimum: number }[] }),
  ]);

  // Non-admin hanya melihat klaster yang boleh dia akses (aturan yang sama dengan Antrian).
  const klasterBoleh = new Set((aksesSaya ?? []).map((a) => a.klaster_id));
  const kunjungan = (kunjunganMentah ?? []).filter((k) => lihatSemua || klasterBoleh.has(k.klaster_tujuan_id));

  const aktif = kunjungan.filter((k) => k.status === "menunggu" || k.status === "dipanggil");
  const selesai = kunjungan.filter((k) => k.status === "selesai");
  const pasienBaru = kunjungan.filter((k) => k.jenis_kunjungan === "baru");
  const belumBayar = kunjungan.filter((k) => !ada(k.tagihan));
  const triaseMerah = aktif.filter((k) => ambilTriase(k.skrining) === "merah");
  const stokMenipis = (bhp.data ?? []).filter((b) => Number(b.stok_saat_ini) <= Number(b.stok_minimum));

  const kartu = [
    { label: "Kunjungan hari ini", nilai: kunjungan.length, href: "/dashboard/kunjungan-hari-ini" },
    { label: "Pasien baru", nilai: pasienBaru.length, href: "/dashboard/kunjungan-hari-ini" },
    { label: "Antrean aktif", nilai: aktif.length, href: "/dashboard/antrian" },
    lihatBelumBayar
      ? { label: "Belum bayar", nilai: belumBayar.length, href: "/dashboard/kasir" }
      : { label: "Selesai dilayani", nilai: selesai.length, href: "/dashboard/antrian" },
  ];

  const peringatan: Peringatan[] = [];
  if (triaseMerah.length > 0) {
    peringatan.push({
      teks: `${triaseMerah.length} pasien triase merah menunggu penanganan`,
      href: "/dashboard/antrian",
      gawat: true,
    });
  }
  if ((rujukanMasuk.count ?? 0) > 0) {
    peringatan.push({
      teks: `${rujukanMasuk.count} rujukan masuk belum diterima`,
      href: "/dashboard/rujukan?tab=masuk",
    });
  }
  if (lihatBelumBayar && belumBayar.length > 0) {
    peringatan.push({
      teks: `${belumBayar.length} kunjungan hari ini belum diproses kasir`,
      href: "/dashboard/kasir",
    });
  }
  if (stokMenipis.length > 0) {
    peringatan.push({ teks: `${stokMenipis.length} BHP stoknya menipis`, href: "/dashboard/farmasi" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Selamat datang, {pemanggil.nama_lengkap}</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Ringkasan pelayanan hari ini
          {lihatSemua ? "." : ", sebatas klaster yang kamu tangani."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kartu.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className="rounded-card border border-sand-100 bg-white p-5 transition-colors hover:border-teal-700/40"
          >
            <p className="text-xs font-medium text-ink/50">{k.label}</p>
            <p className="mt-1.5 text-3xl font-extrabold text-ink">{k.nilai}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-card border border-sand-100 bg-white p-5">
        <h2 className="text-base font-bold text-ink">Peringatan</h2>
        {peringatan.length === 0 ? (
          <p className="mt-2 text-sm text-ink/50">Tidak ada peringatan saat ini.</p>
        ) : (
          <ul className="mt-3 divide-y divide-sand-100/70">
            {peringatan.map((p) => (
              <li key={p.teks}>
                <Link
                  href={p.href}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-teal-700"
                >
                  <span className={p.gawat ? "font-semibold text-clay-700" : "text-ink"}>{p.teks}</span>
                  <span aria-hidden className="text-ink/30">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
