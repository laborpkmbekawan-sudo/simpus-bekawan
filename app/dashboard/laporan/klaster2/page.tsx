import Link from "next/link";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { geserHari, hariIniWib, tanggalPanjang, tanggalValid } from "@/lib/format";
import TombolCetak from "./tombol-cetak";

const PERAN_LAPORAN_UMUM = ["admin", "kapus", "bendahara_bok"];
const MAKS_BARIS = 3000;

type IbuBerisiko = {
  usia_kehamilan_minggu: number | null;
  faktor_risiko: string | null;
  kunjungan: { tanggal: string; pasien: { nama_lengkap: string } | null } | null;
};

type AnakPantau = {
  status_gizi: string | null;
  status_tumbuh_kembang: string | null;
  rencana_tindak_lanjut: string | null;
  kunjungan: { tanggal: string; pasien: { nama_lengkap: string } | null } | null;
};

export default async function LaporanKlaster2({
  searchParams,
}: {
  searchParams: { dari?: string; sampai?: string };
}) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return null;

  const supabase = createClient();

  const { data: klaster2 } = await supabase.from("klaster").select("id").eq("kode", "klaster_2").maybeSingle();

  let bolehLihat = PERAN_LAPORAN_UMUM.includes(pemanggil.peran);
  if (!bolehLihat && klaster2) {
    const { data: akses } = await supabase
      .from("akses_klaster")
      .select("id")
      .eq("pegawai_id", pemanggil.id)
      .eq("klaster_id", klaster2.id)
      .eq("level_akses", "penuh")
      .maybeSingle();
    bolehLihat = !!akses;
  }

  if (!bolehLihat) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kapus, bendahara BOK, atau pegawai dengan akses "penuh" di Klaster 2.
      </div>
    );
  }

  if (!klaster2) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Klaster dengan kode "klaster_2" belum ada di Master Data.
      </div>
    );
  }

  const hariIni = hariIniWib();
  let dari = tanggalValid(searchParams.dari) ? searchParams.dari : geserHari(hariIni, -29);
  let sampai = tanggalValid(searchParams.sampai) ? searchParams.sampai : hariIni;
  if (dari > sampai) [dari, sampai] = [sampai, dari];

  const { data: kunjunganKlaster2 } = await supabase
    .from("kunjungan")
    .select("id")
    .eq("klaster_tujuan_id", klaster2.id)
    .gte("tanggal", dari)
    .lte("tanggal", sampai)
    .limit(MAKS_BARIS);

  const idKunjungan = (kunjunganKlaster2 ?? []).map((k) => k.id);

  const [
    { data: daftarIbuMentah },
    { data: daftarAnakMentah },
    { data: daftarSkriningMentah },
    { data: daftarImunisasiMentah },
  ] =
    idKunjungan.length === 0
      ? [{ data: [] }, { data: [] }, { data: [] }, { data: [] }]
      : await Promise.all([
          supabase
            .from("pelayanan_ibu")
            .select("usia_kehamilan_minggu, status_risiko, faktor_risiko, kunjungan:kunjungan_id (tanggal, pasien:pasien_id (nama_lengkap))")
            .in("kunjungan_id", idKunjungan),
          supabase
            .from("pelayanan_anak")
            .select(
              "status_gizi, status_tumbuh_kembang, rencana_tindak_lanjut, kunjungan:kunjungan_id (tanggal, pasien:pasien_id (nama_lengkap))"
            )
            .in("kunjungan_id", idKunjungan),
          supabase.from("skrining_klaster2").select("jenis_skrining").in("kunjungan_id", idKunjungan).eq("dibatalkan", false),
          supabase
            .from("pemberian_imunisasi")
            .select("jenis_vaksin")
            .in("kunjungan_id", idKunjungan)
            .eq("dibatalkan", false),
        ]);

  const daftarIbu = (daftarIbuMentah ?? []) as unknown as (IbuBerisiko & { status_risiko: string })[];
  const daftarAnak = (daftarAnakMentah ?? []) as unknown as AnakPantau[];
  const ibuBerisikoTinggi = daftarIbu.filter((i) => i.status_risiko === "tinggi");
  const anakPerluPerhatian = daftarAnak.filter(
    (a) =>
      (a.status_tumbuh_kembang && a.status_tumbuh_kembang !== "sesuai") ||
      (a.status_gizi && a.status_gizi !== "gizi_baik")
  );

  const perJenisSkrining = new Map<string, number>();
  for (const s of daftarSkriningMentah ?? []) {
    perJenisSkrining.set(s.jenis_skrining, (perJenisSkrining.get(s.jenis_skrining) ?? 0) + 1);
  }

  const perJenisVaksin = new Map<string, number>();
  for (const v of daftarImunisasiMentah ?? []) {
    perJenisVaksin.set(v.jenis_vaksin, (perJenisVaksin.get(v.jenis_vaksin) ?? 0) + 1);
  }

  const bulanIniMulai = `${hariIni.slice(0, 8)}01`;
  const pintasan = [
    { label: "7 hari terakhir", dari: geserHari(hariIni, -6), sampai: hariIni },
    { label: "30 hari terakhir", dari: geserHari(hariIni, -29), sampai: hariIni },
    { label: "Bulan ini", dari: bulanIniMulai, sampai: hariIni },
  ];

  const kartu = [
    { label: "Kunjungan Klaster 2", nilai: idKunjungan.length },
    { label: "Pelayanan Ibu (ANC)", nilai: daftarIbu.length },
    { label: "Ibu Risiko Tinggi", nilai: ibuBerisikoTinggi.length },
    { label: "Pelayanan Anak", nilai: daftarAnak.length },
    { label: "Skrining Tercatat", nilai: (daftarSkriningMentah ?? []).length },
    { label: "Imunisasi Diberikan", nilai: (daftarImunisasiMentah ?? []).length },
  ];

  const periodeTeks = dari === sampai ? tanggalPanjang(dari) : `${tanggalPanjang(dari)} s.d. ${tanggalPanjang(sampai)}`;

  return (
    <div className="space-y-6">
      <div className="hidden text-center print:block">
        <p className="text-base font-bold">UPTD PUSKESMAS BEKAWAN</p>
        <p className="text-sm">Laporan KIA & Anak (Klaster 2)</p>
        <p className="text-sm">Periode {periodeTeks}</p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Laporan KIA & Anak (Klaster 2)</h1>
          <p className="mt-1.5 text-sm text-ink/60">Rekap ANC, tumbuh kembang, skrining, dan imunisasi.</p>
        </div>
        <TombolCetak />
      </div>

      <div className="space-y-2 print:hidden">
        <form className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label htmlFor="dari" className="text-sm font-bold text-ink/80">Tanggal mulai</label>
            <input id="dari" name="dari" type="date" defaultValue={dari} max={hariIni}
              className="rounded-sm border border-sand-100 bg-white px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="sampai" className="text-sm font-bold text-ink/80">Tanggal akhir</label>
            <input id="sampai" name="sampai" type="date" defaultValue={sampai} max={hariIni}
              className="rounded-sm border border-sand-100 bg-white px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="rounded-sm bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900">
            Tampilkan
          </button>
        </form>
        <div className="flex flex-wrap gap-3 text-xs">
          {pintasan.map((p) => (
            <Link key={p.label} href={`/dashboard/laporan/klaster2?dari=${p.dari}&sampai=${p.sampai}`}
              className="font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2">
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {kartu.map((k) => (
          <div key={k.label} className="rounded-card border border-sand-100 bg-white p-4">
            <p className="text-xs font-medium text-ink/50">{k.label}</p>
            <p className="mt-1 text-xl font-extrabold text-ink">{k.nilai}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <p className="border-b border-sand-100 px-4 py-3 text-sm font-bold text-ink">Skrining per Jenis</p>
          <table className="w-full text-left text-sm">
            <tbody>
              {[...perJenisSkrining.entries()].map(([jenis, jumlah]) => (
                <tr key={jenis} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-4 py-2.5 text-ink">{jenis}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-ink">{jumlah}</td>
                </tr>
              ))}
              {perJenisSkrining.size === 0 && (
                <tr><td className="px-4 py-6 text-center text-sm text-ink/45">Belum ada skrining periode ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <p className="border-b border-sand-100 px-4 py-3 text-sm font-bold text-ink">Imunisasi per Jenis Vaksin</p>
          <table className="w-full text-left text-sm">
            <tbody>
              {[...perJenisVaksin.entries()].map(([vaksin, jumlah]) => (
                <tr key={vaksin} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-4 py-2.5 text-ink">{vaksin}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-ink">{jumlah}</td>
                </tr>
              ))}
              {perJenisVaksin.size === 0 && (
                <tr><td className="px-4 py-6 text-center text-sm text-ink/45">Belum ada imunisasi periode ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <p className="border-b border-sand-100 px-4 py-3 text-sm font-bold text-ink">Register Ibu Berisiko Tinggi</p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-4 py-2.5 font-medium">Tanggal</th>
              <th className="px-4 py-2.5 font-medium">Nama</th>
              <th className="px-4 py-2.5 font-medium">Usia Kehamilan</th>
              <th className="px-4 py-2.5 font-medium">Faktor Risiko</th>
            </tr>
          </thead>
          <tbody>
            {ibuBerisikoTinggi.map((i, idx) => (
              <tr key={idx} className="border-b border-sand-100/70 last:border-0">
                <td className="px-4 py-2.5 text-ink/70">{i.kunjungan?.tanggal ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink">{i.kunjungan?.pasien?.nama_lengkap ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink/70">{i.usia_kehamilan_minggu ?? "—"} minggu</td>
                <td className="px-4 py-2.5 text-ink/70">{i.faktor_risiko ?? "—"}</td>
              </tr>
            ))}
            {ibuBerisikoTinggi.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-ink/45">Tidak ada ibu risiko tinggi periode ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <p className="border-b border-sand-100 px-4 py-3 text-sm font-bold text-ink">Anak Perlu Pemantauan</p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-4 py-2.5 font-medium">Tanggal</th>
              <th className="px-4 py-2.5 font-medium">Nama</th>
              <th className="px-4 py-2.5 font-medium">Status Gizi</th>
              <th className="px-4 py-2.5 font-medium">Tumbuh Kembang</th>
              <th className="px-4 py-2.5 font-medium">Tindak Lanjut</th>
            </tr>
          </thead>
          <tbody>
            {anakPerluPerhatian.map((a, idx) => (
              <tr key={idx} className="border-b border-sand-100/70 last:border-0">
                <td className="px-4 py-2.5 text-ink/70">{a.kunjungan?.tanggal ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink">{a.kunjungan?.pasien?.nama_lengkap ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink/70">{a.status_gizi ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink/70">{a.status_tumbuh_kembang ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink/70">{a.rencana_tindak_lanjut ?? "—"}</td>
              </tr>
            ))}
            {anakPerluPerhatian.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-ink/45">Tidak ada anak yang perlu pemantauan khusus periode ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
