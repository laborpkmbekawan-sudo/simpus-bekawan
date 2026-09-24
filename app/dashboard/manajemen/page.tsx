import Link from "next/link";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { awalHariWib, hariIniWib, selisihHari } from "@/lib/format";

const PERAN_LIHAT = ["admin", "kapus", "manajemen"];

export default async function DashboardManajemen() {
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
  const bulanIni = Number(hariIni.slice(5, 7));
  const tahunIni = Number(hariIni.slice(0, 4));
  const mulaiBulanIni = `${hariIni.slice(0, 8)}01`;

  const [
    { count: kunjunganHariIni },
    { data: spmBulanIni },
    { count: pengaduanAktif },
    { count: insidenAktif },
    { count: rujukanAktif },
    { data: kepuasanBulanIni },
    { data: dokumenSdmMentah },
  ] = await Promise.all([
    supabase.from("kunjungan").select("id", { count: "exact", head: true }).eq("tanggal", hariIni),
    supabase.from("spm_capaian").select("jumlah_capaian, jumlah_target").eq("bulan", bulanIni).eq("tahun", tahunIni),
    supabase
      .from("mutu_insiden")
      .select("id", { count: "exact", head: true })
      .eq("jenis", "keluhan")
      .neq("status_tindak_lanjut", "selesai"),
    supabase
      .from("mutu_insiden")
      .select("id", { count: "exact", head: true })
      .eq("jenis", "insiden")
      .neq("status_tindak_lanjut", "selesai"),
    supabase.from("rujukan").select("id", { count: "exact", head: true }).eq("status", "dibuat"),
    supabase.from("survei_kepuasan").select("nilai").gte("dibuat_pada", awalHariWib(mulaiBulanIni)),
    supabase.from("pegawai_dokumen").select("tanggal_kedaluwarsa").not("tanggal_kedaluwarsa", "is", null),
  ]);

  const indikatorDiisi = (spmBulanIni ?? []).filter((i) => i.jumlah_target && i.jumlah_target > 0);
  const rataCapaian = indikatorDiisi.length
    ? Math.round(
        (indikatorDiisi.reduce((jumlah, i) => jumlah + (i.jumlah_capaian ?? 0) / (i.jumlah_target ?? 1), 0) /
          indikatorDiisi.length) *
          100
      )
    : null;

  const totalSurvei = (kepuasanBulanIni ?? []).length;
  const surveiPuas = (kepuasanBulanIni ?? []).filter((s) => s.nilai === "sangat_puas" || s.nilai === "puas").length;
  const persenPuas = totalSurvei ? Math.round((surveiPuas / totalSurvei) * 100) : null;

  const dokumenSdmPerluPerhatian = (dokumenSdmMentah ?? []).filter(
    (d) => d.tanggal_kedaluwarsa && selisihHari(hariIni, d.tanggal_kedaluwarsa) <= 60
  ).length;

  const kartu = [
    { label: "Kunjungan Hari Ini", nilai: String(kunjunganHariIni ?? 0) },
    { label: "Capaian SPM Bulan Ini", nilai: rataCapaian !== null ? `${rataCapaian}%` : "Belum diisi" },
    { label: "Kepuasan Pasien Bulan Ini", nilai: persenPuas !== null ? `${persenPuas}%` : "Belum ada survei" },
    { label: "Pengaduan Aktif", nilai: String(pengaduanAktif ?? 0) },
    { label: "Insiden Keselamatan Aktif", nilai: String(insidenAktif ?? 0) },
    { label: "Rujukan Menunggu Diterima", nilai: String(rujukanAktif ?? 0) },
  ];

  const perluPerhatian = [
    {
      label: "Pengaduan/keluhan belum selesai",
      nilai: pengaduanAktif ?? 0,
      href: "/dashboard/mutu",
    },
    {
      label: "Insiden keselamatan belum selesai",
      nilai: insidenAktif ?? 0,
      href: "/dashboard/mutu",
    },
    {
      label: "Rujukan menunggu diterima",
      nilai: rujukanAktif ?? 0,
      href: "/dashboard/rujukan",
    },
    {
      label: "Dokumen SDM mau/sudah kedaluwarsa (≤60 hari)",
      nilai: dokumenSdmPerluPerhatian,
      href: "/dashboard/manajemen/sdm",
    },
    {
      label: `Indikator SPM belum diisi bulan ini (${indikatorDiisi.length}/12)`,
      nilai: Math.max(0, 12 - indikatorDiisi.length),
      href: "/dashboard/laporan/spm",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Dashboard Manajemen</h1>
        <p className="mt-1.5 text-sm text-ink/60">Ringkasan lintas bidang buat Kepala Puskesmas & manajemen. Data langsung dari sistem.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {kartu.map((k) => (
          <div key={k.label} className="rounded-card border border-sand-100 bg-white p-4">
            <p className="text-xs font-medium text-ink/50">{k.label}</p>
            <p className="mt-1 text-xl font-extrabold text-ink">{k.nilai}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <p className="border-b border-sand-100 px-4 py-3 text-sm font-bold text-ink">Perlu Perhatian</p>
        <div className="divide-y divide-sand-100/70">
          {perluPerhatian.map((p) => (
            <Link
              key={p.label}
              href={p.href}
              className="flex items-center justify-between px-4 py-3 text-sm hover:bg-sand-50"
            >
              <span className="text-ink/80">{p.label}</span>
              <span className={`font-extrabold ${p.nilai > 0 ? "text-clay-700" : "text-teal-700"}`}>{p.nilai}</span>
            </Link>
          ))}
        </div>
      </div>

      <p className="text-xs text-ink/45">
        Sumber data: kunjungan, Mutu & Keselamatan Pasien, Rujukan, Manajemen SDM, Laporan SPM, dan survei kepuasan
        yang sudah berjalan di sistem ini.
      </p>
    </div>
  );
}
