import Link from "next/link";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { PERAN_KLINIS_LAB, PERAN_LAB } from "@/lib/lab";
import { PelacakLab, PilPrioritasLab, PilStatusLab } from "./../komponen";

type Baris = {
  id: string;
  no_lab: string;
  status: string;
  prioritas: string;
  diminta_pada: string;
  divalidasi_pada: string | null;
  hasil_dilihat_pada: string | null;
  diminta_oleh: string | null;
  kunjungan: {
    pasien: { nama_lengkap: string; no_rm: string } | null;
    klaster: { nama: string } | null;
  } | null;
  items: { id: string; dibatalkan: boolean; pemeriksaan: { nama: string } | null }[];
};

function waktu(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const FILTER = [
  { kunci: "semua", label: "Semua" },
  { kunci: "berjalan", label: "Sedang berjalan" },
  { kunci: "selesai", label: "Hasil selesai" },
] as const;

export default async function HalamanHasilLab({ searchParams }: { searchParams: { tampil?: string; saya?: string } }) {
  const pemanggil = await getPegawaiSaya();
  const boleh = pemanggil && [...PERAN_LAB, ...PERAN_KLINIS_LAB, "kapus"].includes(pemanggil.peran);
  if (!pemanggil || !boleh) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini untuk petugas layanan dan Laboratorium.
      </div>
    );
  }

  const tampil = FILTER.some((f) => f.kunci === searchParams.tampil) ? searchParams.tampil! : "semua";
  // Petugas klinis default melihat permintaannya sendiri; bisa dilebarkan ke semua.
  const klinis = PERAN_KLINIS_LAB.includes(pemanggil.peran);
  const hanyaSaya = searchParams.saya === "0" ? false : klinis;

  const supabase = createClient();
  let q = supabase
    .from("lab_permintaan")
    .select(
      `id, no_lab, status, prioritas, diminta_pada, divalidasi_pada, hasil_dilihat_pada, diminta_oleh,
       kunjungan:kunjungan_id (pasien:pasien_id (nama_lengkap, no_rm), klaster:klaster_tujuan_id (nama)),
       items:lab_permintaan_item (id, dibatalkan, pemeriksaan:pemeriksaan_id (nama))`
    )
    .order("diminta_pada", { ascending: false })
    .limit(60);

  if (hanyaSaya) q = q.eq("diminta_oleh", pemanggil.id);
  if (tampil === "berjalan") q = q.in("status", ["diminta", "sampel_diterima", "proses"]);
  if (tampil === "selesai") q = q.eq("status", "selesai");

  const { data, error } = await q;
  if (error) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Gagal memuat hasil: {error.message}
        {error.message.includes("lab_permintaan") && " — jalankan migrasi_tahap_43.sql di Supabase dulu."}
      </div>
    );
  }

  const daftar = (data ?? []) as unknown as Baris[];
  const href = (t: string, saya: boolean) => `/dashboard/lab/hasil?tampil=${t}${saya === klinis ? "" : `&saya=${saya ? "1" : "0"}`}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Hasil Laboratorium</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Pantau permintaan pemeriksaan sampai hasilnya keluar. Hasil yang baru selesai ditandai sampai kamu buka.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTER.map((f) => (
          <Link
            key={f.kunci}
            href={href(f.kunci, hanyaSaya)}
            className={`rounded-sm px-3.5 py-2 text-xs font-semibold ${
              tampil === f.kunci ? "bg-teal-700 text-white" : "border border-sand-100 bg-white text-ink/70 hover:bg-sand-50"
            }`}
          >
            {f.label}
          </Link>
        ))}
        {klinis && (
          <Link
            href={href(tampil, !hanyaSaya)}
            className="ml-auto rounded-sm border border-sand-100 bg-white px-3.5 py-2 text-xs font-semibold text-ink/70 hover:bg-sand-50"
          >
            {hanyaSaya ? "Tampilkan semua petugas" : "Hanya permintaan saya"}
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {daftar.map((p) => {
          const pasien = p.kunjungan?.pasien;
          const baru = p.status === "selesai" && !p.hasil_dilihat_pada && p.diminta_oleh === pemanggil.id;
          return (
            <Link
              key={p.id}
              href={`/dashboard/lab/hasil/${p.id}`}
              className={`block rounded-card border bg-white p-5 transition-colors hover:bg-sand-50 ${
                baru ? "border-teal-700/50" : "border-sand-100"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-extrabold text-ink">
                    {pasien?.nama_lengkap ?? "Pasien"} <span className="text-sm font-medium text-ink/40">{p.no_lab}</span>
                  </p>
                  <p className="text-xs text-ink/50">
                    No. RM {pasien?.no_rm ?? "-"} · {p.kunjungan?.klaster?.nama ?? ""} · Diminta {waktu(p.diminta_pada)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {baru && <span className="rounded-sm bg-teal-700 px-2.5 py-1 text-xs font-bold text-white">Baru</span>}
                  <PilPrioritasLab prioritas={p.prioritas} />
                  <PilStatusLab status={p.status} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.items
                  .filter((i) => !i.dibatalkan)
                  .map((i) => (
                    <span key={i.id} className="rounded-sm bg-teal-700/10 px-2.5 py-1 text-xs font-semibold text-teal-700">
                      {i.pemeriksaan?.nama ?? "—"}
                    </span>
                  ))}
              </div>
              <div className="mt-3">
                <PelacakLab status={p.status} />
              </div>
            </Link>
          );
        })}
        {daftar.length === 0 && (
          <div className="rounded-card border border-sand-100 bg-white px-5 py-6 text-center text-sm text-ink/45">
            Belum ada permintaan lab{hanyaSaya ? " dari kamu" : ""}.
          </div>
        )}
      </div>
    </div>
  );
}
