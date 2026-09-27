import Link from "next/link";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { geserHari, hariIniWib, tanggalPanjang, tanggalValid } from "@/lib/format";
import TombolCetak from "./tombol-cetak";

const PERAN_LAPORAN_UMUM = ["admin", "kapus", "bendahara_bok"];
const MAKS_BARIS = 3000;

type PosbinduBaris = {
  tanggal: string;
  faktor_risiko: string | null;
  tindak_lanjut: string | null;
  posyandu: { nama: string } | null;
  pasien: { nama_lengkap: string } | null;
};

type ProlanisBaris = {
  tanggal_kontrol: string;
  jenis_penyakit: string;
  keluhan: string | null;
  tindak_lanjut: string | null;
  pasien: { nama_lengkap: string } | null;
};

type KeswaBaris = {
  skor: number;
  tindak_lanjut: string | null;
  kunjungan: { tanggal: string; pasien: { nama_lengkap: string } | null } | null;
};

const LABEL_PENYAKIT: Record<string, string> = {
  hipertensi: "Hipertensi",
  diabetes_melitus: "Diabetes Melitus",
  keduanya: "Hipertensi & Diabetes",
};

export default async function LaporanKlaster3({
  searchParams,
}: {
  searchParams: { dari?: string; sampai?: string };
}) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return null;

  const supabase = createClient();

  const { data: klaster3 } = await supabase.from("klaster").select("id").eq("kode", "klaster_3").maybeSingle();

  let bolehLihat = PERAN_LAPORAN_UMUM.includes(pemanggil.peran);
  if (!bolehLihat && klaster3) {
    const { data: akses } = await supabase
      .from("akses_klaster")
      .select("id")
      .eq("pegawai_id", pemanggil.id)
      .eq("klaster_id", klaster3.id)
      .eq("level_akses", "penuh")
      .maybeSingle();
    bolehLihat = !!akses;
  }

  if (!bolehLihat) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kapus, bendahara BOK, atau pegawai dengan akses "penuh" di Klaster 3.
      </div>
    );
  }

  if (!klaster3) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Klaster dengan kode "klaster_3" belum ada di Master Data.
      </div>
    );
  }

  const hariIni = hariIniWib();
  let dari = tanggalValid(searchParams.dari) ? searchParams.dari : geserHari(hariIni, -29);
  let sampai = tanggalValid(searchParams.sampai) ? searchParams.sampai : hariIni;
  if (dari > sampai) [dari, sampai] = [sampai, dari];

  const { data: kunjunganKlaster3 } = await supabase
    .from("kunjungan")
    .select("id")
    .eq("klaster_tujuan_id", klaster3.id)
    .gte("tanggal", dari)
    .lte("tanggal", sampai)
    .limit(MAKS_BARIS);

  const idKunjungan = (kunjunganKlaster3 ?? []).map((k) => k.id);

  const [
    { data: daftarPosbinduMentah },
    { data: daftarProlanisMentah },
    { data: daftarSkriningK3Mentah },
    { data: daftarKeswaMentah },
  ] = await Promise.all([
    supabase
      .from("kegiatan_posbindu_ptm")
      .select("tanggal, faktor_risiko, tindak_lanjut, hasil_skrining, posyandu:posyandu_id (nama), pasien:pasien_id (nama_lengkap)")
      .eq("dibatalkan", false)
      .gte("tanggal", dari)
      .lte("tanggal", sampai)
      .limit(MAKS_BARIS),
    supabase
      .from("kontrol_prolanis")
      .select("tanggal_kontrol, jenis_penyakit, keluhan, tindak_lanjut, kepatuhan_obat, pasien:pasien_id (nama_lengkap)")
      .eq("dibatalkan", false)
      .gte("tanggal_kontrol", dari)
      .lte("tanggal_kontrol", sampai)
      .limit(MAKS_BARIS),
    idKunjungan.length === 0
      ? Promise.resolve({ data: [] })
      : supabase.from("skrining_klaster3").select("jenis_skrining").in("kunjungan_id", idKunjungan).eq("dibatalkan", false),
    idKunjungan.length === 0
      ? Promise.resolve({ data: [] })
      : supabase
          .from("skrining_keswa")
          .select("skor, kategori, tindak_lanjut, kunjungan:kunjungan_id (tanggal, pasien:pasien_id (nama_lengkap))")
          .in("kunjungan_id", idKunjungan)
          .eq("dibatalkan", false),
  ]);

  const daftarPosbindu = (daftarPosbinduMentah ?? []) as unknown as (PosbinduBaris & { hasil_skrining: string })[];
  const daftarProlanis = (daftarProlanisMentah ?? []) as unknown as (ProlanisBaris & { kepatuhan_obat: string })[];
  const daftarKeswa = (daftarKeswaMentah ?? []) as unknown as (KeswaBaris & { kategori: string })[];

  const posbinduPerluRujukan = daftarPosbindu.filter((p) => p.hasil_skrining === "perlu_rujukan");
  const prolanisTidakPatuh = daftarProlanis.filter((p) => p.kepatuhan_obat === "tidak_patuh");
  const keswaTerindikasi = daftarKeswa.filter((k) => k.kategori === "terindikasi_masalah_emosional");

  const perJenisSkrining = new Map<string, number>();
  for (const s of daftarSkriningK3Mentah ?? []) {
    perJenisSkrining.set(s.jenis_skrining, (perJenisSkrining.get(s.jenis_skrining) ?? 0) + 1);
  }

  const bulanIniMulai = `${hariIni.slice(0, 8)}01`;
  const pintasan = [
    { label: "7 hari terakhir", dari: geserHari(hariIni, -6), sampai: hariIni },
    { label: "30 hari terakhir", dari: geserHari(hariIni, -29), sampai: hariIni },
    { label: "Bulan ini", dari: bulanIniMulai, sampai: hariIni },
  ];

  const kartu = [
    { label: "Kunjungan Klaster 3", nilai: idKunjungan.length },
    { label: "Kegiatan Posbindu PTM", nilai: daftarPosbindu.length },
    { label: "Kontrol Prolanis", nilai: daftarProlanis.length },
    { label: "Posbindu Perlu Rujukan", nilai: posbinduPerluRujukan.length },
    { label: "Prolanis Tidak Patuh Obat", nilai: prolanisTidakPatuh.length },
    { label: "Skrining Jiwa Terindikasi", nilai: keswaTerindikasi.length },
  ];

  const periodeTeks = dari === sampai ? tanggalPanjang(dari) : `${tanggalPanjang(dari)} s.d. ${tanggalPanjang(sampai)}`;

  return (
    <div className="space-y-6">
      <div className="hidden text-center print:block">
        <p className="text-base font-bold">UPTD PUSKESMAS BEKAWAN</p>
        <p className="text-sm">Laporan Usia Produktif & Lansia (Klaster 3)</p>
        <p className="text-sm">Periode {periodeTeks}</p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Laporan Usia Produktif & Lansia (Klaster 3)</h1>
          <p className="mt-1.5 text-sm text-ink/60">Rekap Posbindu PTM, kontrol Prolanis, skrining, dan skrining jiwa.</p>
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
            <Link key={p.label} href={`/dashboard/laporan/klaster3?dari=${p.dari}&sampai=${p.sampai}`}
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

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <p className="border-b border-sand-100 px-4 py-3 text-sm font-bold text-ink">Skrining Terstruktur per Jenis</p>
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
        <p className="border-b border-sand-100 px-4 py-3 text-sm font-bold text-ink">Register Posbindu Perlu Rujukan</p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-4 py-2.5 font-medium">Tanggal</th>
              <th className="px-4 py-2.5 font-medium">Nama</th>
              <th className="px-4 py-2.5 font-medium">Posyandu</th>
              <th className="px-4 py-2.5 font-medium">Faktor Risiko</th>
              <th className="px-4 py-2.5 font-medium">Tindak Lanjut</th>
            </tr>
          </thead>
          <tbody>
            {posbinduPerluRujukan.map((p, idx) => (
              <tr key={idx} className="border-b border-sand-100/70 last:border-0">
                <td className="px-4 py-2.5 text-ink/70">{p.tanggal}</td>
                <td className="px-4 py-2.5 text-ink">{p.pasien?.nama_lengkap ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink/70">{p.posyandu?.nama ?? "Puskesmas"}</td>
                <td className="px-4 py-2.5 text-ink/70">{p.faktor_risiko ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink/70">{p.tindak_lanjut ?? "—"}</td>
              </tr>
            ))}
            {posbinduPerluRujukan.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-ink/45">Tidak ada yang perlu rujukan periode ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <p className="border-b border-sand-100 px-4 py-3 text-sm font-bold text-ink">Register Prolanis Tidak Patuh Obat</p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-4 py-2.5 font-medium">Tanggal</th>
              <th className="px-4 py-2.5 font-medium">Nama</th>
              <th className="px-4 py-2.5 font-medium">Jenis</th>
              <th className="px-4 py-2.5 font-medium">Keluhan</th>
              <th className="px-4 py-2.5 font-medium">Tindak Lanjut</th>
            </tr>
          </thead>
          <tbody>
            {prolanisTidakPatuh.map((p, idx) => (
              <tr key={idx} className="border-b border-sand-100/70 last:border-0">
                <td className="px-4 py-2.5 text-ink/70">{p.tanggal_kontrol}</td>
                <td className="px-4 py-2.5 text-ink">{p.pasien?.nama_lengkap ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink/70">{LABEL_PENYAKIT[p.jenis_penyakit] ?? p.jenis_penyakit}</td>
                <td className="px-4 py-2.5 text-ink/70">{p.keluhan ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink/70">{p.tindak_lanjut ?? "—"}</td>
              </tr>
            ))}
            {prolanisTidakPatuh.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-ink/45">Tidak ada yang tidak patuh obat periode ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <p className="border-b border-sand-100 px-4 py-3 text-sm font-bold text-ink">Register Skrining Jiwa Terindikasi (SRQ-20)</p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-4 py-2.5 font-medium">Tanggal</th>
              <th className="px-4 py-2.5 font-medium">Nama</th>
              <th className="px-4 py-2.5 font-medium">Skor</th>
              <th className="px-4 py-2.5 font-medium">Tindak Lanjut</th>
            </tr>
          </thead>
          <tbody>
            {keswaTerindikasi.map((k, idx) => (
              <tr key={idx} className="border-b border-sand-100/70 last:border-0">
                <td className="px-4 py-2.5 text-ink/70">{k.kunjungan?.tanggal ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink">{k.kunjungan?.pasien?.nama_lengkap ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink/70">{k.skor}/20</td>
                <td className="px-4 py-2.5 text-ink/70">{k.tindak_lanjut ?? "—"}</td>
              </tr>
            ))}
            {keswaTerindikasi.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-ink/45">Tidak ada yang terindikasi periode ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
