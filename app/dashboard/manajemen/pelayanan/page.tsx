import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { geserHari, hariIniWib } from "@/lib/format";

const PERAN_LIHAT = ["admin", "kapus", "manajemen"];

type Klaster = { id: string; nama: string; kode: string; kelompok: string; kode_antrian: string | null };

export default async function HalamanManajemenPelayanan() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LIHAT.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kapus, atau manajemen.
      </div>
    );
  }

  const supabase = createClient();
  const hariIni = hariIniWib();
  const mulai7Hari = geserHari(hariIni, -6);

  const [{ data: daftarKlaster }, { data: aksesMentah }, { data: kunjunganHariIniMentah }, { data: kunjungan7HariMentah }] =
    await Promise.all([
      supabase.from("klaster").select("id, nama, kode, kelompok, kode_antrian").order("urutan"),
      supabase.from("akses_klaster").select("klaster_id"),
      supabase.from("kunjungan").select("klaster_tujuan_id, status").eq("tanggal", hariIni),
      supabase.from("kunjungan").select("klaster_tujuan_id").gte("tanggal", mulai7Hari).lte("tanggal", hariIni),
    ]);

  const klasterList = (daftarKlaster ?? []) as Klaster[];

  const tenagaPerKlaster = new Map<string, number>();
  for (const a of aksesMentah ?? []) {
    tenagaPerKlaster.set(a.klaster_id, (tenagaPerKlaster.get(a.klaster_id) ?? 0) + 1);
  }

  const kunjunganHariIniPerKlaster = new Map<string, { total: number; selesai: number }>();
  for (const k of kunjunganHariIniMentah ?? []) {
    const cur = kunjunganHariIniPerKlaster.get(k.klaster_tujuan_id) ?? { total: 0, selesai: 0 };
    cur.total += 1;
    if (k.status === "selesai") cur.selesai += 1;
    kunjunganHariIniPerKlaster.set(k.klaster_tujuan_id, cur);
  }

  const beban7HariPerKlaster = new Map<string, number>();
  for (const k of kunjungan7HariMentah ?? []) {
    beban7HariPerKlaster.set(k.klaster_tujuan_id, (beban7HariPerKlaster.get(k.klaster_tujuan_id) ?? 0) + 1);
  }

  const totalKunjunganHariIni = (kunjunganHariIniMentah ?? []).length;
  const totalTenaga = (aksesMentah ?? []).length;

  const kartu = [
    { label: "Total Unit Pelayanan", nilai: klasterList.length },
    { label: "Kunjungan Hari Ini (Semua Unit)", nilai: totalKunjunganHariIni },
    { label: "Total Penempatan Tenaga", nilai: totalTenaga },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Manajemen Pelayanan</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Monitoring unit pelayanan (klaster & lintas klaster): tenaga terpasang dan beban kunjungan.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kartu.map((k) => (
          <div key={k.label} className="rounded-card border border-sand-100 bg-white p-4">
            <p className="text-xs font-medium text-ink/50">{k.label}</p>
            <p className="mt-1 text-xl font-extrabold text-ink">{k.nilai}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-4 py-3 font-medium">Unit Pelayanan</th>
              <th className="px-4 py-3 font-medium">Kelompok</th>
              <th className="px-4 py-3 text-right font-medium">Tenaga</th>
              <th className="px-4 py-3 text-right font-medium">Kunjungan Hari Ini</th>
              <th className="px-4 py-3 text-right font-medium">Selesai Hari Ini</th>
              <th className="px-4 py-3 text-right font-medium">Beban 7 Hari</th>
            </tr>
          </thead>
          <tbody>
            {klasterList.map((k) => {
              const hariIniData = kunjunganHariIniPerKlaster.get(k.id) ?? { total: 0, selesai: 0 };
              return (
                <tr key={k.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-4 py-3 text-ink">{k.nama}</td>
                  <td className="px-4 py-3 text-ink/60">{k.kelompok === "klaster" ? "Klaster" : "Lintas Klaster"}</td>
                  <td className="px-4 py-3 text-right text-ink/70">{tenagaPerKlaster.get(k.id) ?? 0}</td>
                  <td className="px-4 py-3 text-right font-medium text-ink">{hariIniData.total}</td>
                  <td className="px-4 py-3 text-right text-ink/70">{hariIniData.selesai}</td>
                  <td className="px-4 py-3 text-right text-ink/70">{beban7HariPerKlaster.get(k.id) ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink/45">
        "Tenaga" dihitung dari jumlah pegawai yang punya akses ke unit tersebut (Menu Pegawai). Waktu tunggu belum
        bisa dihitung karena sistem belum mencatat jam dipanggil/selesai per kunjungan.
      </p>
    </div>
  );
}
