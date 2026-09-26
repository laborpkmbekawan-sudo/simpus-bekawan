import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { geserHari, hariIniWib } from "@/lib/format";
import TabKohort, { type BarisKohortIbu, type BarisKohortAnak } from "./tab-kohort";

type KunjunganRingkas = { tanggal: string; pasien: { id: string; no_rm: string; nama_lengkap: string } | null };

type IbuMentah = {
  usia_kehamilan_minggu: number | null;
  hpl: string | null;
  status_risiko: string;
  faktor_risiko: string | null;
  kunjungan: KunjunganRingkas | null;
};

type AnakMentah = {
  berat_badan: number | null;
  panjang_tinggi_badan: number | null;
  status_gizi: string | null;
  status_tumbuh_kembang: string | null;
  kunjungan: (KunjunganRingkas & { pasien: (KunjunganRingkas["pasien"] & { tanggal_lahir: string | null }) | null }) | null;
};

function umurTahun(tanggalLahir: string | null, acuan: string): number | null {
  if (!tanggalLahir) return null;
  const lahir = new Date(tanggalLahir);
  const pada = new Date(acuan);
  let umur = pada.getFullYear() - lahir.getFullYear();
  const belumUlangTahun =
    pada.getMonth() < lahir.getMonth() || (pada.getMonth() === lahir.getMonth() && pada.getDate() < lahir.getDate());
  if (belumUlangTahun) umur -= 1;
  return umur;
}

function umurBulan(tanggalLahir: string | null, acuan: string): number | null {
  if (!tanggalLahir) return null;
  const lahir = new Date(tanggalLahir);
  const pada = new Date(acuan);
  return (pada.getFullYear() - lahir.getFullYear()) * 12 + (pada.getMonth() - lahir.getMonth());
}

export default async function KohortRegisterKlaster2() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return null;

  const supabase = createClient();
  const { data: klaster2 } = await supabase.from("klaster").select("id, nama").eq("kode", "klaster_2").maybeSingle();

  if (!klaster2) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Klaster dengan kode "klaster_2" belum ada di Master Data.
      </div>
    );
  }

  let bolehLihat = ["admin", "kapus"].includes(pemanggil.peran);
  if (!bolehLihat) {
    const { data: akses } = await supabase
      .from("akses_klaster")
      .select("id")
      .eq("pegawai_id", pemanggil.id)
      .eq("klaster_id", klaster2.id)
      .maybeSingle();
    bolehLihat = !!akses;
  }

  if (!bolehLihat) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kapus, atau pegawai dengan akses Klaster 2.
      </div>
    );
  }

  const hariIni = hariIniWib();
  // Jendela kohort ibu hamil ~10 bulan (cakup lama kehamilan penuh + jeda),
  // kohort bayi & balita ~5 tahun (batas usia balita).
  const mulaiIbu = geserHari(hariIni, -299);
  const mulaiAnak = geserHari(hariIni, -1824);

  const [{ data: kunjunganIbuMentah }, { data: kunjunganAnakMentah }] = await Promise.all([
    supabase
      .from("kunjungan")
      .select("id")
      .eq("klaster_tujuan_id", klaster2.id)
      .gte("tanggal", mulaiIbu)
      .lte("tanggal", hariIni)
      .limit(3000),
    supabase
      .from("kunjungan")
      .select("id")
      .eq("klaster_tujuan_id", klaster2.id)
      .gte("tanggal", mulaiAnak)
      .lte("tanggal", hariIni)
      .limit(3000),
  ]);

  const idIbu = (kunjunganIbuMentah ?? []).map((k) => k.id);
  const idAnak = (kunjunganAnakMentah ?? []).map((k) => k.id);

  const [{ data: ibuMentah }, { data: anakMentah }] = await Promise.all([
    idIbu.length
      ? supabase
          .from("pelayanan_ibu")
          .select(
            "usia_kehamilan_minggu, hpl, status_risiko, faktor_risiko, kunjungan:kunjungan_id (tanggal, pasien:pasien_id (id, no_rm, nama_lengkap))"
          )
          .in("kunjungan_id", idIbu)
      : Promise.resolve({ data: [] }),
    idAnak.length
      ? supabase
          .from("pelayanan_anak")
          .select(
            "berat_badan, panjang_tinggi_badan, status_gizi, status_tumbuh_kembang, kunjungan:kunjungan_id (tanggal, pasien:pasien_id (id, no_rm, nama_lengkap, tanggal_lahir))"
          )
          .in("kunjungan_id", idAnak)
      : Promise.resolve({ data: [] }),
  ]);

  // Kohort Ibu Hamil: satu baris per pasien, diambil dari kunjungan ANC
  // TERAKHIR yang tercatat dalam jendela ~10 bulan. Ini bukan status hamil
  // resmi (sistem belum punya penanda "sudah bersalin"), jadi dianggap
  // masih dalam pemantauan selama masih dalam jendela ini.
  const petaIbu = new Map<string, BarisKohortIbu>();
  for (const row of (ibuMentah ?? []) as unknown as IbuMentah[]) {
    const pasien = row.kunjungan?.pasien;
    const tanggal = row.kunjungan?.tanggal;
    if (!pasien || !tanggal) continue;
    const ada = petaIbu.get(pasien.id);
    if (!ada || tanggal > ada.tanggalKunjunganTerakhir) {
      petaIbu.set(pasien.id, {
        pasienId: pasien.id,
        noRm: pasien.no_rm,
        nama: pasien.nama_lengkap,
        tanggalKunjunganTerakhir: tanggal,
        usiaKehamilanMinggu: row.usia_kehamilan_minggu,
        hpl: row.hpl,
        statusRisiko: row.status_risiko,
        faktorRisiko: row.faktor_risiko,
      });
    }
  }
  const kohortIbu = [...petaIbu.values()].sort((a, b) => b.tanggalKunjunganTerakhir.localeCompare(a.tanggalKunjunganTerakhir));

  // Kohort Bayi & Balita: sama polanya, satu baris terbaru per pasien,
  // difilter umur < 5 tahun per HARI INI (bukan per tanggal kunjungan),
  // biar anak yang udah lewat 5 tahun otomatis hilang dari daftar.
  const petaAnak = new Map<string, BarisKohortAnak>();
  for (const row of (anakMentah ?? []) as unknown as AnakMentah[]) {
    const pasien = row.kunjungan?.pasien;
    const tanggal = row.kunjungan?.tanggal;
    if (!pasien || !tanggal) continue;
    const umur = umurTahun(pasien.tanggal_lahir, hariIni);
    if (umur === null || umur >= 5) continue;
    const ada = petaAnak.get(pasien.id);
    if (!ada || tanggal > ada.tanggalKunjunganTerakhir) {
      petaAnak.set(pasien.id, {
        pasienId: pasien.id,
        noRm: pasien.no_rm,
        nama: pasien.nama_lengkap,
        tanggalKunjunganTerakhir: tanggal,
        umurBulan: umurBulan(pasien.tanggal_lahir, hariIni),
        beratBadan: row.berat_badan,
        panjangTinggiBadan: row.panjang_tinggi_badan,
        statusGizi: row.status_gizi,
        statusTumbuhKembang: row.status_tumbuh_kembang,
      });
    }
  }
  const kohortAnak = [...petaAnak.values()].sort((a, b) => b.tanggalKunjunganTerakhir.localeCompare(a.tanggalKunjunganTerakhir));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Kohort & Register — {klaster2.nama}</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Satu baris per pasien, diambil dari kunjungan terakhir yang tercatat. Bukan status resmi (mis. "sudah
          bersalin") — cuma penanda masih dalam jendela pemantauan.
        </p>
      </div>

      <TabKohort kohortIbu={kohortIbu} kohortAnak={kohortAnak} />
    </div>
  );
}
