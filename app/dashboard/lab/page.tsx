import Link from "next/link";
import { createClient, getPegawaiSaya, getKodeAksesSaya, punyaAkses } from "@/lib/supabase/server";
import { PERAN_LAB, kadaluarsaEfektif, statusJadwal, statusKadaluarsa, umurTahun } from "@/lib/lab";
import { awalHariWib, hariIniWib } from "@/lib/format";
import AksiAntreanLab from "./aksi-antrean";
import { PelacakLab, PilPrioritasLab, PilStatusLab } from "./komponen";

type Permintaan = {
  id: string;
  no_lab: string;
  status: string;
  prioritas: string;
  diagnosis_kerja: string | null;
  catatan_klinis: string | null;
  diminta_oleh_nama: string | null;
  diminta_pada: string;
  divalidasi_pada: string | null;
  jumlah_tolak: number | null;
  sampel_ditolak_alasan: string | null;
  kunjungan: {
    nomor_antrian: number;
    pasien: { nama_lengkap: string; no_rm: string; jenis_kelamin: string | null; tanggal_lahir: string | null } | null;
    klaster: { nama: string; kode_antrian: string | null } | null;
  } | null;
  items: { id: string; dibatalkan: boolean; pemeriksaan: { nama: string } | null }[];
};

const SELECT_PERMINTAAN = `
  id, no_lab, status, prioritas, diagnosis_kerja, catatan_klinis, diminta_oleh_nama, diminta_pada, divalidasi_pada, jumlah_tolak, sampel_ditolak_alasan,
  kunjungan:kunjungan_id (
    nomor_antrian,
    pasien:pasien_id (nama_lengkap, no_rm, jenis_kelamin, tanggal_lahir),
    klaster:klaster_tujuan_id (nama, kode_antrian)
  ),
  items:lab_permintaan_item (id, dibatalkan, pemeriksaan:pemeriksaan_id (nama))
`;

function waktu(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Kartu({ p }: { p: Permintaan }) {
  const pasien = p.kunjungan?.pasien;
  const kl = p.kunjungan?.klaster;
  const item = p.items.filter((i) => !i.dibatalkan);
  return (
    <div
      className={`rounded-card border bg-white p-5 ${
        p.prioritas === "cito" && p.status !== "selesai" ? "border-red-500/40" : "border-sand-100"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-extrabold text-ink">
            {pasien?.nama_lengkap ?? "Pasien"}{" "}
            <span className="text-sm font-medium text-ink/40">{p.no_lab}</span>
          </p>
          <p className="text-xs text-ink/50">
            No. RM {pasien?.no_rm ?? "-"} · {pasien?.jenis_kelamin === "L" ? "Laki-laki" : pasien?.jenis_kelamin === "P" ? "Perempuan" : "—"} ·{" "}
            {umurTahun(pasien?.tanggal_lahir ?? null)}
          </p>
          <p className="mt-0.5 text-xs text-ink/50">
            Dari {kl?.nama ?? "klaster"}
            {p.diminta_oleh_nama ? ` · ${p.diminta_oleh_nama}` : ""} · {waktu(p.diminta_pada)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PilPrioritasLab prioritas={p.prioritas} />
          <PilStatusLab status={p.status} />
        </div>
      </div>

      {p.status === "diminta" && (p.jumlah_tolak ?? 0) > 0 && (
        <p className="mt-3 rounded-sm bg-clay-600/10 px-3 py-2 text-xs text-clay-700">
          <span className="font-bold">Sampel sebelumnya ditolak</span>
          {p.sampel_ditolak_alasan ? `: ${p.sampel_ditolak_alasan}` : ""}. Menunggu sampel baru dari klaster.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.map((i) => (
          <span key={i.id} className="rounded-sm bg-teal-700/10 px-2.5 py-1 text-xs font-semibold text-teal-700">
            {i.pemeriksaan?.nama ?? "—"}
          </span>
        ))}
      </div>

      {(p.diagnosis_kerja || p.catatan_klinis) && (
        <div className="mt-3 space-y-0.5 text-sm text-ink/70">
          {p.diagnosis_kerja && (
            <p>
              <span className="font-bold">Diagnosis kerja:</span> {p.diagnosis_kerja}
            </p>
          )}
          {p.catatan_klinis && (
            <p>
              <span className="font-bold">Catatan klinis:</span> {p.catatan_klinis}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-sand-100 pt-4">
        <PelacakLab status={p.status} />
        <AksiAntreanLab id={p.id} status={p.status} />
      </div>
    </div>
  );
}

function Bagian({ judul, daftar, kosong }: { judul: string; daftar: Permintaan[]; kosong: string }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-ink/45">
        {judul} ({daftar.length})
      </h2>
      {daftar.map((p) => (
        <Kartu key={p.id} p={p} />
      ))}
      {daftar.length === 0 && (
        <div className="rounded-card border border-sand-100 bg-white px-5 py-6 text-center text-sm text-ink/45">{kosong}</div>
      )}
    </section>
  );
}

export default async function HalamanAntreanLab() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus Laboratorium/admin.
      </div>
    );
  }
  const kodeAkses = await getKodeAksesSaya(pemanggil.id, pemanggil.peran);
  if (!punyaAkses(kodeAkses, "lintas_lab")) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Akunmu belum dikasih akses ke Laboratorium. Minta admin nambahin akses klaster &quot;Lintas Klaster -
        Laboratorium&quot; di halaman Data Pegawai.
      </div>
    );
  }

  const supabase = createClient();
  const awalHari = awalHariWib(hariIniWib());

  const [{ data: aktifMentah, error }, { data: selesaiMentah }] = await Promise.all([
    supabase
      .from("lab_permintaan")
      .select(SELECT_PERMINTAAN)
      .in("status", ["diminta", "sampel_diterima", "proses"])
      .order("diminta_pada", { ascending: true }),
    supabase
      .from("lab_permintaan")
      .select(SELECT_PERMINTAAN)
      .eq("status", "selesai")
      .gte("divalidasi_pada", awalHari)
      .order("divalidasi_pada", { ascending: false }),
  ]);

  if (error) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Gagal memuat antrean: {error.message}
        {error.message.includes("lab_permintaan") && " — jalankan migrasi_tahap_43.sql di Supabase dulu."}
      </div>
    );
  }

  // Peringatan: hasil kritis yang belum dicatat dilaporkan + rujukan keluar menunggu hasil.
  // Gagal (mis. migrasi 46 belum jalan) tidak boleh merusak antrean, jadi galat diabaikan.
  const [{ data: kritisMentah }, { count: rujukanMenunggu }] = await Promise.all([
    supabase
      .from("lab_permintaan")
      .select("id, no_lab, kunjungan:kunjungan_id (pasien:pasien_id (nama_lengkap)), items:lab_permintaan_item!inner (hasil:lab_hasil!inner (kritis))")
      .eq("items.hasil.kritis", true)
      .is("kritis_dilaporkan_pada", null)
      .in("status", ["proses", "selesai"]),
    supabase.from("lab_rujukan_keluar").select("id", { count: "exact", head: true }).eq("status", "dikirim"),
  ]);
  // Peringatan alat (kalibrasi/pemeliharaan telat, rusak) dan lot reagen kadaluarsa.
  // Sama seperti di atas: galat (mis. migrasi 48 belum jalan) diabaikan.
  const hariIni = hariIniWib();
  const [{ data: alatMentah }, { data: lotMentah }] = await Promise.all([
    supabase
      .from("lab_alat")
      .select("kondisi, interval_kalibrasi_hari, kalibrasi_berikutnya, interval_pemeliharaan_hari, pemeliharaan_berikutnya")
      .neq("kondisi", "nonaktif"),
    supabase
      .from("lab_reagen_lot")
      .select("tanggal_kadaluarsa, stabilitas_hari, tanggal_dibuka")
      .in("status", ["tersimpan", "dipakai"]),
  ]);
  const alatBermasalah = (
    (alatMentah ?? []) as {
      kondisi: string;
      interval_kalibrasi_hari: number | null;
      kalibrasi_berikutnya: string | null;
      interval_pemeliharaan_hari: number | null;
      pemeliharaan_berikutnya: string | null;
    }[]
  ).filter((a) => {
    const kal = statusJadwal(a.interval_kalibrasi_hari, a.kalibrasi_berikutnya, hariIni).status;
    const pem = statusJadwal(a.interval_pemeliharaan_hari, a.pemeliharaan_berikutnya, hariIni).status;
    return a.kondisi === "rusak" || a.kondisi === "perlu_perbaikan" || kal === "terlambat" || pem === "terlambat";
  }).length;
  const lotBermasalah = (
    (lotMentah ?? []) as { tanggal_kadaluarsa: string; stabilitas_hari: number | null; tanggal_dibuka: string | null }[]
  ).filter((l) => statusKadaluarsa(kadaluarsaEfektif(l).tanggal, hariIni).status !== "aman").length;

  const kritisBelumLapor = (kritisMentah ?? []) as unknown as {
    id: string;
    no_lab: string;
    kunjungan: { pasien: { nama_lengkap: string } | null } | null;
  }[];

  const aktif = (aktifMentah ?? []) as unknown as Permintaan[];
  // Cito naik ke atas, sisanya urut waktu masuk.
  const urut = (a: Permintaan, b: Permintaan) =>
    (a.prioritas === "cito" ? 0 : 1) - (b.prioritas === "cito" ? 0 : 1) || a.diminta_pada.localeCompare(b.diminta_pada);
  const masuk = aktif.filter((p) => p.status === "diminta").sort(urut);
  const dikerjakan = aktif.filter((p) => p.status !== "diminta").sort(urut);
  const selesai = (selesaiMentah ?? []) as unknown as Permintaan[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Antrean Permintaan Lab</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Permintaan dari klaster masuk otomatis. Terima sampel, input hasil, lalu validasi — hasil langsung terkirim ke
          klaster yang meminta.
        </p>
      </div>

      {kritisBelumLapor.length > 0 && (
        <div className="rounded-card border border-red-600/30 bg-red-600/10 p-4">
          <p className="text-sm font-bold text-red-700">⚠ {kritisBelumLapor.length} hasil kritis belum dicatat dilaporkan</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {kritisBelumLapor.map((k) => (
              <Link
                key={k.id}
                href={`/dashboard/lab/hasil/${k.id}`}
                className="rounded-sm bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                {k.kunjungan?.pasien?.nama_lengkap ?? "Pasien"} · {k.no_lab}
              </Link>
            ))}
          </div>
        </div>
      )}

      {(rujukanMenunggu ?? 0) > 0 && (
        <Link
          href="/dashboard/lab/rujukan"
          className="block rounded-card border border-clay-600/30 bg-clay-600/10 px-4 py-3 text-sm font-semibold text-clay-700"
        >
          {rujukanMenunggu} rujukan lab keluar menunggu hasil →
        </Link>
      )}

      {alatBermasalah > 0 && (
        <Link
          href="/dashboard/lab/alat"
          className="block rounded-card border border-clay-600/30 bg-clay-600/10 px-4 py-3 text-sm font-semibold text-clay-700"
        >
          {alatBermasalah} alat lab perlu perhatian (kalibrasi/pemeliharaan terlambat atau alat bermasalah) →
        </Link>
      )}

      {lotBermasalah > 0 && (
        <Link
          href="/dashboard/lab/reagen"
          className="block rounded-card border border-clay-600/30 bg-clay-600/10 px-4 py-3 text-sm font-semibold text-clay-700"
        >
          {lotBermasalah} lot reagen kadaluarsa atau segera kadaluarsa →
        </Link>
      )}

      <Bagian judul="Permintaan masuk" daftar={masuk} kosong="Belum ada permintaan baru." />
      <Bagian judul="Sedang dikerjakan" daftar={dikerjakan} kosong="Tidak ada pemeriksaan yang sedang dikerjakan." />
      <Bagian judul="Selesai hari ini" daftar={selesai} kosong="Belum ada hasil yang divalidasi hari ini." />
    </div>
  );
}
