import Link from "next/link";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { waktuWib } from "@/lib/format";

const PERAN_LAPORAN = ["admin", "kapus"];
const BATAS_BARIS = 300;

const LABEL_TABEL: Record<string, string> = {
  pasien: "Pasien",
  kunjungan: "Kunjungan",
  catatan_klinis: "Catatan Klinis",
  tagihan: "Tagihan",
  pegawai: "Pegawai",
};

const DAFTAR_TABEL = ["pasien", "kunjungan", "catatan_klinis", "tagihan", "pegawai"];

const WARNA_AKSI: Record<string, string> = {
  insert: "bg-teal-700/10 text-teal-700",
  update: "bg-clay-600/10 text-clay-700",
  delete: "bg-red-500/10 text-red-600",
};
const LABEL_AKSI: Record<string, string> = { insert: "Dibuat", update: "Diubah", delete: "Dihapus" };

type BarisLog = {
  id: string;
  tabel: string;
  baris_id: string;
  aksi: "insert" | "update" | "delete";
  data_lama: Record<string, unknown> | null;
  data_baru: Record<string, unknown> | null;
  dilakukan_oleh: string | null;
  dilakukan_pada: string;
  pegawai: { nama_lengkap: string } | { nama_lengkap: string }[] | null;
};

// Field internal yang gak perlu ditampilkan di ringkasan (berisik / gak informatif).
const FIELD_DIABAIKAN = new Set(["diperbarui_pada", "dibuat_pada", "id"]);

function namaPegawaiDari(p: BarisLog["pegawai"]): string {
  const baris = Array.isArray(p) ? p[0] : p;
  return baris?.nama_lengkap ?? "Sistem";
}

function tampilNilai(v: unknown): string {
  if (v === null || v === undefined || v === "") return "kosong";
  if (typeof v === "string" && v.length > 40) return `${v.slice(0, 40)}…`;
  return String(v);
}

function ringkasan(baris: BarisLog): string {
  if (baris.aksi === "insert") return "Data baru dibuat";
  if (baris.aksi === "delete") return "Data dihapus";

  const lama = baris.data_lama ?? {};
  const baru = baris.data_baru ?? {};
  const berubah = Object.keys(baru).filter(
    (k) => !FIELD_DIABAIKAN.has(k) && JSON.stringify(baru[k]) !== JSON.stringify(lama[k])
  );

  if (berubah.length === 0) return "Tidak ada perubahan nilai";

  const tampil = berubah
    .slice(0, 3)
    .map((k) => `${k}: ${tampilNilai(lama[k])} → ${tampilNilai(baru[k])}`)
    .join("; ");

  return berubah.length > 3 ? `${tampil}; +${berubah.length - 3} field lagi` : tampil;
}

export default async function LaporanAktivitas({
  searchParams,
}: {
  searchParams: { tabel?: string };
}) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return null;

  if (!PERAN_LAPORAN.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin dan kepala puskesmas.
      </div>
    );
  }

  const tabelDipilih = DAFTAR_TABEL.includes(searchParams.tabel ?? "") ? searchParams.tabel! : "";

  const supabase = createClient();
  let query = supabase
    .from("log_aktivitas")
    .select("id, tabel, baris_id, aksi, data_lama, data_baru, dilakukan_oleh, dilakukan_pada, pegawai:dilakukan_oleh (nama_lengkap)")
    .order("dilakukan_pada", { ascending: false })
    .limit(BATAS_BARIS);

  if (tabelDipilih) query = query.eq("tabel", tabelDipilih);

  const { data, error } = await query;

  if (error) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Gagal memuat log aktivitas: {error.message}
        {error.message.includes("log_aktivitas") && (
          <p className="mt-1">Kemungkinan migrasi tahap 9 belum dijalankan di Supabase.</p>
        )}
      </div>
    );
  }

  const baris = (data as unknown as BarisLog[]) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Log Aktivitas</h1>
        <p className="mt-1 text-sm text-ink/60">
          Riwayat perubahan otomatis di 5 tabel penting: Pasien, Kunjungan, Catatan Klinis, Tagihan,
          Pegawai. Menampilkan {BATAS_BARIS} entri terbaru.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/laporan/aktivitas"
          className={`rounded-sm px-3 py-1.5 text-xs font-semibold ${
            tabelDipilih === "" ? "bg-teal-700 text-white" : "border border-sand-100 bg-white text-ink/70"
          }`}
        >
          Semua tabel
        </Link>
        {DAFTAR_TABEL.map((t) => (
          <Link
            key={t}
            href={`/dashboard/laporan/aktivitas?tabel=${t}`}
            className={`rounded-sm px-3 py-1.5 text-xs font-semibold ${
              tabelDipilih === t ? "bg-teal-700 text-white" : "border border-sand-100 bg-white text-ink/70"
            }`}
          >
            {LABEL_TABEL[t]}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-card border border-sand-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-sand-100 bg-sand-50 text-xs uppercase tracking-wide text-ink/45">
            <tr>
              <th className="px-4 py-3 font-semibold">Waktu</th>
              <th className="px-4 py-3 font-semibold">Tabel</th>
              <th className="px-4 py-3 font-semibold">Aksi</th>
              <th className="px-4 py-3 font-semibold">Oleh</th>
              <th className="px-4 py-3 font-semibold">Perubahan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {baris.map((b) => (
              <tr key={b.id}>
                <td className="whitespace-nowrap px-4 py-3 text-ink/70">{waktuWib(b.dilakukan_pada)}</td>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">
                  {LABEL_TABEL[b.tabel] ?? b.tabel}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${WARNA_AKSI[b.aksi]}`}>
                    {LABEL_AKSI[b.aksi]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-ink/70">{namaPegawaiDari(b.pegawai)}</td>
                <td className="px-4 py-3 text-ink/60">{ringkasan(b)}</td>
              </tr>
            ))}
            {baris.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink/45">
                  Belum ada aktivitas tercatat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
