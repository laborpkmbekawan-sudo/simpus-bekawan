import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import FormCatatanKlinis from "./form-catatan-klinis";
import ChecklistTindakan from "./checklist-tindakan";
import TombolSelesai from "./tombol-selesai";
import FormPelayananIbu, { type DataPelayananIbu } from "./form-pelayanan-ibu";
import FormPelayananAnak, { type DataPelayananAnak } from "./form-pelayanan-anak";
import FormSkrining, { type SkriningTercatat } from "./form-skrining";
import FormImunisasi, { type ImunisasiTercatat } from "./form-imunisasi";
import FormSkriningKlaster3, { type SkriningKlaster3Tercatat } from "./form-skrining-klaster3";
import FormSkriningKeswa, { type SkriningKeswaTercatat } from "./form-skrining-keswa";
import FormKesproCaten, { type KesproCatenTercatat } from "./form-kespro-caten";
import FormPenyakitMenular, { type PenyakitMenularTercatat } from "./form-penyakit-menular";
import FormSkriningPtm, { type SkriningPtmTercatat } from "./form-skrining-ptm";
import FormKankerTalasemia, { type KankerTalasemiaTercatat } from "./form-kanker-talasemia";
import FormImunisasiWus, { type ImunisasiWusTercatat } from "./form-imunisasi-wus";
import FormKesehatanKerja, { type KesehatanKerjaTercatat } from "./form-kesehatan-kerja";

const PERAN_KLINIS = ["admin", "dokter", "dokter_gigi", "perawat", "bidan"];

const WARNA_TRIASE: Record<string, string> = {
  hijau: "bg-teal-700/10 text-teal-700",
  kuning: "bg-clay-600/10 text-clay-700",
  merah: "bg-red-500/10 text-red-600",
};

type Pasien = {
  id: string;
  no_rm: string;
  nama_lengkap: string;
  tanggal_lahir: string | null;
  jenis_kelamin: string | null;
  alergi: string | null;
  no_bpjs: string | null;
  jenis_penjamin: string | null;
};

type Skrining = {
  keluhan_utama: string | null;
  tekanan_darah_sistolik: number | null;
  tekanan_darah_diastolik: number | null;
  nadi: number | null;
  suhu: number | null;
  frekuensi_napas: number | null;
  berat_badan: number | null;
  tinggi_badan: number | null;
  prioritas_triase: string;
  catatan: string | null;
};

function hitungUmur(tanggalLahir: string | null) {
  if (!tanggalLahir) return "—";
  const lahir = new Date(tanggalLahir);
  const sekarang = new Date();
  let umur = sekarang.getFullYear() - lahir.getFullYear();
  const belum =
    sekarang.getMonth() < lahir.getMonth() ||
    (sekarang.getMonth() === lahir.getMonth() && sekarang.getDate() < lahir.getDate());
  if (belum) umur -= 1;
  return `${umur} tahun`;
}

// Angka umur mentah, dipakai buat nentuin kelompok Klaster 3 (dewasa/lansia).
// Kemenkes: lansia >= 60 tahun.
function umurAngka(tanggalLahir: string | null): number | null {
  if (!tanggalLahir) return null;
  const lahir = new Date(tanggalLahir);
  const sekarang = new Date();
  let umur = sekarang.getFullYear() - lahir.getFullYear();
  const belum =
    sekarang.getMonth() < lahir.getMonth() ||
    (sekarang.getMonth() === lahir.getMonth() && sekarang.getDate() < lahir.getDate());
  if (belum) umur -= 1;
  return umur;
}

function Pesan({ judul, isi, href, labelHref }: { judul: string; isi: string; href: string; labelHref: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-card border border-sand-100 bg-white p-8 text-center">
      <p className="text-lg font-bold text-ink">{judul}</p>
      <p className="mt-2 text-sm text-ink/60">{isi}</p>
      <Link
        href={href}
        className="mt-5 inline-block rounded-sm bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900"
      >
        {labelHref}
      </Link>
    </div>
  );
}

function Ttv({ label, nilai, satuan }: { label: string; nilai: string | number | null; satuan?: string }) {
  return (
    <div className="rounded-sm border border-sand-100 bg-sand-50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-ink/40">{label}</p>
      <p className="text-sm font-bold text-ink">
        {nilai === null || nilai === "" ? "—" : nilai}
        {nilai !== null && nilai !== "" && satuan ? <span className="ml-1 text-xs font-normal text-ink/50">{satuan}</span> : null}
      </p>
    </div>
  );
}

export default async function HalamanPelayanan({ params }: { params: { kunjunganId: string } }) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return null;

  const supabase = createClient();

  // Query dipecah + select("*") biar satu kolom yang beda di database
  // gak bikin seluruh halaman 404 diam-diam. Error asli ditampilkan.
  const { data: kunjungan, error: errKunjungan } = await supabase
    .from("kunjungan")
    .select("*")
    .eq("id", params.kunjunganId)
    .maybeSingle();

  if (errKunjungan) {
    return (
      <Pesan
        judul="Gagal memuat kunjungan"
        isi={`${errKunjungan.message}${errKunjungan.hint ? ` (${errKunjungan.hint})` : ""}`}
        href="/dashboard/antrian"
        labelHref="Kembali ke Antrian"
      />
    );
  }
  if (!kunjungan) notFound();

  const [
    { data: pasienData, error: errPasien },
    { data: klasterData },
    { data: skriningData },
  ] = await Promise.all([
    supabase.from("pasien").select("*").eq("id", kunjungan.pasien_id).maybeSingle(),
    supabase.from("klaster").select("kode, nama, kode_antrian").eq("id", kunjungan.klaster_tujuan_id).maybeSingle(),
    supabase.from("skrining").select("*").eq("kunjungan_id", kunjungan.id).maybeSingle(),
  ]);

  if (errPasien || !pasienData) {
    return (
      <Pesan
        judul="Data pasien tidak terbaca"
        isi={errPasien?.message ?? "Pasien untuk kunjungan ini tidak ditemukan."}
        href="/dashboard/antrian"
        labelHref="Kembali ke Antrian"
      />
    );
  }

  const pasien = pasienData as unknown as Pasien;
  const klaster = klasterData as { kode: string; nama: string; kode_antrian: string | null } | null;
  const klaster2 = klaster?.kode === "klaster_2";
  const klaster3 = klaster?.kode === "klaster_3";
  const kelompokUsiaK3: "dewasa" | "lansia" = (umurAngka(pasien.tanggal_lahir) ?? 0) >= 60 ? "lansia" : "dewasa";
  const skrining = skriningData as unknown as Skrining | null;

  if (!PERAN_KLINIS.includes(pemanggil.peran)) {
    return (
      <Pesan
        judul="Khusus tenaga klinis"
        isi="Halaman pelayanan cuma bisa dibuka dokter, dokter gigi, perawat, atau bidan."
        href="/dashboard/antrian"
        labelHref="Kembali ke Antrian"
      />
    );
  }

  if (pemanggil.peran !== "admin") {
    const { data: akses } = await supabase
      .from("akses_klaster")
      .select("id")
      .eq("pegawai_id", pemanggil.id)
      .eq("klaster_id", kunjungan.klaster_tujuan_id)
      .maybeSingle();
    if (!akses) {
      return (
        <Pesan
          judul="Bukan klaster kamu"
          isi="Kunjungan ini ditujukan ke klaster yang gak ada di akses akunmu."
          href="/dashboard/antrian"
          labelHref="Kembali ke Antrian"
        />
      );
    }
  }

  if (kunjungan.status === "selesai") {
    return (
      <Pesan
        judul="Pelayanan sudah selesai"
        isi="Kunjungan ini sudah ditutup. Hasilnya bisa dilihat (baca saja) di Rekam Medis pasien."
        href={`/dashboard/rekam-medis/${pasien.id}`}
        labelHref="Buka Rekam Medis"
      />
    );
  }

  const [
    { data: catatan },
    { data: daftarTarifMentah },
    { data: daftarResepMentah },
    { data: tindakanMentah },
    { data: riwayatMentah },
    { data: pelayananIbuData },
    { data: pelayananAnakData },
    { data: daftarSkriningMentah },
    { data: riwayatImunisasiMentah },
    { data: daftarSkriningK3Mentah },
    { data: daftarSkriningKeswaMentah },
    { data: daftarKesproCatenMentah },
    { data: daftarPenyakitMenularMentah },
    { data: daftarSkriningPtmMentah },
    { data: daftarKankerTalasemiaMentah },
    { data: daftarImunisasiWusMentah },
    { data: daftarKesehatanKerjaMentah },
  ] = await Promise.all([
    supabase
      .from("catatan_klinis")
      .select("subjektif, objektif, diagnosis, kode_icd10, tindakan")
      .eq("kunjungan_id", kunjungan.id)
      .maybeSingle(),
    supabase
      .from("tarif_layanan")
      .select("id, nama_layanan, harga, kategori")
      .eq("aktif", true)
      .order("kategori")
      .order("nama_layanan"),
    supabase.from("resep_bhp_tindakan").select("tarif_layanan_id, jumlah_default, bhp:bhp_id (id, nama_bhp, satuan)"),
    supabase
      .from("kunjungan_tindakan")
      .select(
        "id, dicatat_pada, tarif:tarif_layanan_id (nama_layanan), kunjungan_tindakan_bhp (jumlah_terpakai, bhp:bhp_id (nama_bhp, satuan))"
      )
      .eq("kunjungan_id", kunjungan.id)
      .eq("dibatalkan", false)
      .order("dicatat_pada", { ascending: false }),
    supabase
      .from("kunjungan")
      .select("id, tanggal, catatan_klinis (diagnosis)")
      .eq("pasien_id", pasien.id)
      .neq("id", kunjungan.id)
      .order("tanggal", { ascending: false })
      .limit(3),
    klaster2
      ? supabase
          .from("pelayanan_ibu")
          .select(
            "usia_kehamilan_minggu, gravida, para, abortus, hpht, hpl, td_sistolik, td_diastolik, berat_badan, lila, tfu, djj, status_risiko, faktor_risiko, catatan"
          )
          .eq("kunjungan_id", kunjungan.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    klaster2
      ? supabase
          .from("pelayanan_anak")
          .select(
            "berat_badan, panjang_tinggi_badan, lingkar_kepala, status_gizi, status_tumbuh_kembang, klasifikasi_mtbs, keluhan, catatan, rencana_tindak_lanjut"
          )
          .eq("kunjungan_id", kunjungan.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    klaster2
      ? supabase
          .from("skrining_klaster2")
          .select("id, jenis_skrining, klasifikasi, tindak_lanjut, dicatat_pada")
          .eq("kunjungan_id", kunjungan.id)
          .eq("dibatalkan", false)
          .order("dicatat_pada", { ascending: false })
      : Promise.resolve({ data: null }),
    klaster2
      ? supabase
          .from("pemberian_imunisasi")
          .select("id, jenis_vaksin, tanggal_pemberian, nomor_batch, reaksi_kipi, jadwal_berikutnya")
          .eq("pasien_id", pasien.id)
          .eq("dibatalkan", false)
          .order("tanggal_pemberian", { ascending: false })
      : Promise.resolve({ data: null }),
    klaster3
      ? supabase
          .from("skrining_klaster3")
          .select("id, jenis_skrining, klasifikasi, tindak_lanjut, dicatat_pada")
          .eq("kunjungan_id", kunjungan.id)
          .eq("kelompok_usia", kelompokUsiaK3)
          .eq("dibatalkan", false)
          .order("dicatat_pada", { ascending: false })
      : Promise.resolve({ data: null }),
    klaster3 && kelompokUsiaK3 === "dewasa"
      ? supabase
          .from("skrining_keswa")
          .select("id, jawaban_ya, skor, kategori, tindak_lanjut, dicatat_pada")
          .eq("kunjungan_id", kunjungan.id)
          .eq("dibatalkan", false)
          .order("dicatat_pada", { ascending: false })
      : Promise.resolve({ data: null }),
    klaster3 && kelompokUsiaK3 === "dewasa"
      ? supabase
          .from("pemeriksaan_kespro_caten")
          .select("id, status_caten, lila, hb, hasil_hiv, hasil_sifilis, hasil_hepatitis_b, rekomendasi, tindak_lanjut, dicatat_pada")
          .eq("kunjungan_id", kunjungan.id)
          .eq("dibatalkan", false)
          .order("dicatat_pada", { ascending: false })
      : Promise.resolve({ data: null }),
    klaster3
      ? supabase
          .from("pemeriksaan_penyakit_menular")
          .select("id, hasil_pemeriksaan_tb, status_pengobatan_tb, hasil_hiv, hasil_ims, tindak_lanjut, dicatat_pada")
          .eq("kunjungan_id", kunjungan.id)
          .eq("kelompok_usia", kelompokUsiaK3)
          .eq("dibatalkan", false)
          .order("dicatat_pada", { ascending: false })
      : Promise.resolve({ data: null }),
    klaster3 && kelompokUsiaK3 === "dewasa"
      ? supabase
          .from("skrining_ptm_terstruktur")
          .select("id, td_sistolik, td_diastolik, gula_darah_puasa, gula_darah_sewaktu, imt, hasil_skrining, tindak_lanjut, dicatat_pada")
          .eq("kunjungan_id", kunjungan.id)
          .eq("dibatalkan", false)
          .order("dicatat_pada", { ascending: false })
      : Promise.resolve({ data: null }),
    klaster3 && kelompokUsiaK3 === "dewasa"
      ? supabase
          .from("skrining_kanker_talasemia")
          .select("id, hasil_iva, hasil_sadanis, hasil_talasemia, tindak_lanjut, dicatat_pada")
          .eq("kunjungan_id", kunjungan.id)
          .eq("dibatalkan", false)
          .order("dicatat_pada", { ascending: false })
      : Promise.resolve({ data: null }),
    klaster3 && kelompokUsiaK3 === "dewasa"
      ? supabase
          .from("skrining_imunisasi_wus")
          .select("id, status_tt, diberikan_hari_ini, jenis_vaksin, jadwal_berikutnya, tindak_lanjut, dicatat_pada")
          .eq("kunjungan_id", kunjungan.id)
          .eq("dibatalkan", false)
          .order("dicatat_pada", { ascending: false })
      : Promise.resolve({ data: null }),
    klaster3 && kelompokUsiaK3 === "dewasa"
      ? supabase
          .from("pemeriksaan_kesehatan_kerja")
          .select("id, jenis_pekerjaan, pajanan_risiko, diagnosis_pak, tindak_lanjut, dicatat_pada")
          .eq("kunjungan_id", kunjungan.id)
          .eq("dibatalkan", false)
          .order("dicatat_pada", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  const dataIbu = (pelayananIbuData ?? null) as unknown as DataPelayananIbu | null;
  const dataAnak = (pelayananAnakData ?? null) as unknown as DataPelayananAnak | null;
  const daftarSkrining = (daftarSkriningMentah ?? []) as unknown as SkriningTercatat[];
  const riwayatImunisasi = (riwayatImunisasiMentah ?? []) as unknown as ImunisasiTercatat[];
  const daftarSkriningK3 = (daftarSkriningK3Mentah ?? []) as unknown as SkriningKlaster3Tercatat[];
  const daftarSkriningKeswa = (daftarSkriningKeswaMentah ?? []) as unknown as SkriningKeswaTercatat[];
  const daftarKesproCaten = (daftarKesproCatenMentah ?? []) as unknown as KesproCatenTercatat[];
  const daftarPenyakitMenular = (daftarPenyakitMenularMentah ?? []) as unknown as PenyakitMenularTercatat[];
  const daftarSkriningPtm = (daftarSkriningPtmMentah ?? []) as unknown as SkriningPtmTercatat[];
  const daftarKankerTalasemia = (daftarKankerTalasemiaMentah ?? []) as unknown as KankerTalasemiaTercatat[];
  const daftarImunisasiWus = (daftarImunisasiWusMentah ?? []) as unknown as ImunisasiWusTercatat[];
  const daftarKesehatanKerja = (daftarKesehatanKerjaMentah ?? []) as unknown as KesehatanKerjaTercatat[];

  const resepPerTarif: Record<string, { bhp_id: string; nama_bhp: string; satuan: string; jumlah_default: number }[]> = {};
  for (const r of daftarResepMentah ?? []) {
    const bhp = r.bhp as unknown as { id: string; nama_bhp: string; satuan: string } | null;
    if (!bhp) continue;
    const daftar = resepPerTarif[r.tarif_layanan_id] ?? [];
    daftar.push({ bhp_id: bhp.id, nama_bhp: bhp.nama_bhp, satuan: bhp.satuan, jumlah_default: Number(r.jumlah_default) });
    resepPerTarif[r.tarif_layanan_id] = daftar;
  }

  const tindakanTercatat = (tindakanMentah ?? []).map((t) => ({
    id: t.id,
    namaLayanan: (t.tarif as unknown as { nama_layanan: string } | null)?.nama_layanan ?? "—",
    dicatatPada: t.dicatat_pada,
    items: (
      (t.kunjungan_tindakan_bhp as unknown as
        | { jumlah_terpakai: number; bhp: { nama_bhp: string; satuan: string } | null }[]
        | null) ?? []
    ).map((i) => ({
      namaBhp: i.bhp?.nama_bhp ?? "—",
      jumlah: Number(i.jumlah_terpakai),
      satuan: i.bhp?.satuan ?? "",
    })),
  }));

  const riwayatSingkat = (riwayatMentah ?? []).map((k) => {
    const c = k.catatan_klinis as unknown as { diagnosis: string | null } | { diagnosis: string | null }[] | null;
    const diagnosis = Array.isArray(c) ? c[0]?.diagnosis : c?.diagnosis;
    return { id: k.id, tanggal: k.tanggal, diagnosis: diagnosis ?? null };
  });

  const penjamin = kunjungan.jenis_penjamin ?? pasien.jenis_penjamin ?? "umum";
  const nomorTampil = klaster?.kode_antrian
    ? `${klaster.kode_antrian}-${String(kunjungan.nomor_antrian).padStart(2, "0")}`
    : String(kunjungan.nomor_antrian);
  const td =
    skrining?.tekanan_darah_sistolik != null && skrining?.tekanan_darah_diastolik != null
      ? `${skrining.tekanan_darah_sistolik}/${skrining.tekanan_darah_diastolik}`
      : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/antrian"
          className="text-sm font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
        >
          ← Kembali ke Antrian
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold text-ink">Pelayanan Pasien</h1>
        <p className="mt-1 text-sm text-ink/60">
          {klaster?.nama ?? "Klaster"} · Antrian {nomorTampil} · Kunjungan {kunjungan.jenis_kunjungan}
        </p>
      </div>

      {/* Identitas + anamnesis dari pendaftaran */}
      <section className="space-y-4 rounded-card border border-sand-100 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-ink">{pasien.nama_lengkap}</p>
            <p className="text-sm text-ink/60">
              No. RM {pasien.no_rm} · {pasien.jenis_kelamin === "L" ? "Laki-laki" : pasien.jenis_kelamin === "P" ? "Perempuan" : "—"} ·{" "}
              {hitungUmur(pasien.tanggal_lahir)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/rujukan?rm=${pasien.no_rm}&kunjungan=${kunjungan.id}`}
              className="rounded-sm border border-sand-100 px-2.5 py-1 text-xs font-semibold text-clay-700 hover:bg-sand-50"
            >
              Rujuk
            </Link>
            <span className="rounded-sm bg-ink/5 px-2.5 py-1 text-xs font-semibold uppercase text-ink/70">
              {penjamin === "bpjs" ? "BPJS" : "Umum"}
            </span>
            {skrining && (
              <span className={`rounded-sm px-2.5 py-1 text-xs font-semibold capitalize ${WARNA_TRIASE[skrining.prioritas_triase]}`}>
                Triase {skrining.prioritas_triase}
              </span>
            )}
          </div>
        </div>

        {pasien.alergi && (
          <p className="rounded-sm bg-clay-600/10 px-3.5 py-2.5 text-sm text-clay-700">
            <span className="font-bold">Alergi:</span> {pasien.alergi}
          </p>
        )}

        {skrining ? (
          <>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/40">Keluhan utama</p>
              <p className="text-sm text-ink">{skrining.keluhan_utama || "—"}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <Ttv label="Tekanan darah" nilai={td} satuan="mmHg" />
              <Ttv label="Nadi" nilai={skrining.nadi} satuan="x/mnt" />
              <Ttv label="Suhu" nilai={skrining.suhu} satuan="°C" />
              <Ttv label="Napas" nilai={skrining.frekuensi_napas} satuan="x/mnt" />
              <Ttv label="Berat" nilai={skrining.berat_badan} satuan="kg" />
              <Ttv label="Tinggi" nilai={skrining.tinggi_badan} satuan="cm" />
            </div>
            {skrining.catatan && (
              <p className="text-sm text-ink/70">
                <span className="font-bold text-ink/70">Catatan skrining:</span> {skrining.catatan}
              </p>
            )}
          </>
        ) : (
          <p className="rounded-sm bg-sand-50 px-4 py-3 text-sm text-ink/50">Belum ada skrining awal untuk kunjungan ini.</p>
        )}

        {riwayatSingkat.length > 0 && (
          <div className="border-t border-sand-100 pt-3">
            <p className="mb-1.5 text-xs uppercase tracking-wide text-ink/40">Kunjungan sebelumnya</p>
            <ul className="space-y-1 text-sm text-ink/70">
              {riwayatSingkat.map((r) => (
                <li key={r.id}>
                  {new Date(r.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })} —{" "}
                  {r.diagnosis || "belum ada diagnosis"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {klaster2 && (
        <section className="rounded-card border border-sand-100 bg-white p-5">
          <h2 className="text-base font-bold text-ink">Data Ibu (ANC/Kehamilan)</h2>
          <p className="mb-4 mt-0.5 text-xs text-ink/50">Isi kalau pasien ibu hamil/nifas. Lewati kalau bukan.</p>
          <FormPelayananIbu kunjunganId={kunjungan.id} data={dataIbu} />
        </section>
      )}

      {klaster2 && (
        <section className="rounded-card border border-sand-100 bg-white p-5">
          <h2 className="text-base font-bold text-ink">Data Anak (Tumbuh Kembang/MTBS)</h2>
          <p className="mb-4 mt-0.5 text-xs text-ink/50">Isi kalau pasien bayi/anak. Lewati kalau bukan.</p>
          <FormPelayananAnak kunjunganId={kunjungan.id} data={dataAnak} />
        </section>
      )}

      {klaster2 && (
        <section className="rounded-card border border-sand-100 bg-white p-5">
          <h2 className="text-base font-bold text-ink">Skrining Terstruktur</h2>
          <p className="mb-4 mt-0.5 text-xs text-ink/50">SDIDTK, MTBS/MTBM, gizi, anemia, psikososial. Bisa lebih dari satu per kunjungan.</p>
          <FormSkrining kunjunganId={kunjungan.id} daftarSkrining={daftarSkrining} />
        </section>
      )}

      {klaster2 && (
        <section className="rounded-card border border-sand-100 bg-white p-5">
          <h2 className="text-base font-bold text-ink">Imunisasi</h2>
          <p className="mb-4 mt-0.5 text-xs text-ink/50">Riwayat di bawah gabungan semua kunjungan pasien ini, bukan cuma kunjungan sekarang.</p>
          <FormImunisasi kunjunganId={kunjungan.id} pasienId={pasien.id} riwayat={riwayatImunisasi} />
        </section>
      )}

      {klaster3 && (
        <section className="rounded-card border border-sand-100 bg-white p-5">
          <h2 className="text-base font-bold text-ink">
            {kelompokUsiaK3 === "lansia" ? "Skrining Lansia & Geriatri" : "Skrining Usia Dewasa (Produktif)"}
          </h2>
          <p className="mb-4 mt-0.5 text-xs text-ink/50">
            Kelompok ditentukan otomatis dari umur pasien ({hitungUmur(pasien.tanggal_lahir)}). Bisa lebih dari satu jenis
            skrining per kunjungan.
          </p>
          <FormSkriningKlaster3 kunjunganId={kunjungan.id} kelompokUsia={kelompokUsiaK3} daftarSkrining={daftarSkriningK3} />
        </section>
      )}

      {klaster3 && (
        <section className="rounded-card border border-sand-100 bg-white p-5">
          <h2 className="text-base font-bold text-ink">Skrining Penyakit Menular (TB/HIV/IMS)</h2>
          <p className="mb-4 mt-0.5 text-xs text-ink/50">
            Skrining terstruktur TB, HIV, dan IMS. Hasil positif/reaktif otomatis ditandai buat rekap laporan.
          </p>
          <FormPenyakitMenular kunjunganId={kunjungan.id} kelompokUsia={kelompokUsiaK3} daftarPemeriksaan={daftarPenyakitMenular} />
        </section>
      )}

      {klaster3 && kelompokUsiaK3 === "dewasa" && (
        <section className="rounded-card border border-sand-100 bg-white p-5">
          <h2 className="text-base font-bold text-ink">Skrining PTM Terstruktur</h2>
          <p className="mb-4 mt-0.5 text-xs text-ink/50">
            Tekanan darah, gula darah, IMT, lingkar perut. Versi dalam gedung, terpisah dari Posbindu luar gedung.
          </p>
          <FormSkriningPtm kunjunganId={kunjungan.id} daftarSkrining={daftarSkriningPtm} />
        </section>
      )}

      {klaster3 && kelompokUsiaK3 === "dewasa" && (
        <section className="rounded-card border border-sand-100 bg-white p-5">
          <h2 className="text-base font-bold text-ink">Skrining Kanker & Talasemia</h2>
          <p className="mb-4 mt-0.5 text-xs text-ink/50">
            Deteksi dini kanker leher rahim (IVA), kanker payudara (SADANIS), dan pembawa sifat talasemia.
          </p>
          <FormKankerTalasemia kunjunganId={kunjungan.id} daftarPemeriksaan={daftarKankerTalasemia} />
        </section>
      )}

      {klaster3 && kelompokUsiaK3 === "dewasa" && (
        <section className="rounded-card border border-sand-100 bg-white p-5">
          <h2 className="text-base font-bold text-ink">Skrining Kesehatan Jiwa (SRQ-20)</h2>
          <p className="mb-4 mt-0.5 text-xs text-ink/50">
            Deteksi dini masalah kesehatan jiwa emosional pada usia produktif. Skor 6 ke atas, atau jawaban "Ya" pada soal
            risiko bunuh diri, terindikasi perlu tindak lanjut.
          </p>
          <FormSkriningKeswa kunjunganId={kunjungan.id} daftarSkrining={daftarSkriningKeswa} />
        </section>
      )}

      {klaster3 && kelompokUsiaK3 === "dewasa" && (
        <section className="rounded-card border border-sand-100 bg-white p-5">
          <h2 className="text-base font-bold text-ink">Kesehatan Reproduksi & Calon Pengantin (Caten)</h2>
          <p className="mb-4 mt-0.5 text-xs text-ink/50">
            Gizi (LILA/IMT), Hb, golongan darah, status TT, dan skrining HIV/Sifilis/Hepatitis B.
          </p>
          <FormKesproCaten kunjunganId={kunjungan.id} daftarPemeriksaan={daftarKesproCaten} />
        </section>
      )}

      {klaster3 && kelompokUsiaK3 === "dewasa" && (
        <section className="rounded-card border border-sand-100 bg-white p-5">
          <h2 className="text-base font-bold text-ink">Skrining Imunisasi WUS</h2>
          <p className="mb-4 mt-0.5 text-xs text-ink/50">
            Status imunisasi Tetanus Toksoid (TT/Td) buat wanita usia subur (WUS) 15–49 tahun.
          </p>
          <FormImunisasiWus kunjunganId={kunjungan.id} daftarSkrining={daftarImunisasiWus} />
        </section>
      )}

      {klaster3 && kelompokUsiaK3 === "dewasa" && (
        <section className="rounded-card border border-sand-100 bg-white p-5">
          <h2 className="text-base font-bold text-ink">Kesehatan Kerja</h2>
          <p className="mb-4 mt-0.5 text-xs text-ink/50">
            Skrining Upaya Kesehatan Kerja (UKK): pajanan risiko di tempat kerja dan deteksi dini Penyakit Akibat Kerja (PAK).
          </p>
          <FormKesehatanKerja kunjunganId={kunjungan.id} daftarPemeriksaan={daftarKesehatanKerja} />
        </section>
      )}

      <section className="rounded-card border border-sand-100 bg-white p-5">
        <h2 className="mb-4 text-base font-bold text-ink">Catatan Klinis (SOAP)</h2>
        <FormCatatanKlinis
          kunjunganId={kunjungan.id}
          subjektif={catatan?.subjektif ?? skrining?.keluhan_utama ?? ""}
          subjektifDariSkrining={!catatan?.subjektif && !!skrining?.keluhan_utama}
          objektif={catatan?.objektif ?? ""}
          diagnosis={catatan?.diagnosis ?? ""}
          kodeIcd10={catatan?.kode_icd10 ?? ""}
          tindakan={catatan?.tindakan ?? ""}
        />
      </section>

      <section className="rounded-card border border-sand-100 bg-white p-5">
        <h2 className="mb-4 text-base font-bold text-ink">Tindakan & BHP</h2>
        <ChecklistTindakan
          kunjunganId={kunjungan.id}
          daftarTarif={daftarTarifMentah ?? []}
          resepPerTarif={resepPerTarif}
          tindakanTercatat={tindakanTercatat}
        />
      </section>

      <div className="flex justify-end">
        <TombolSelesai kunjunganId={kunjungan.id} />
      </div>
    </div>
  );
}
