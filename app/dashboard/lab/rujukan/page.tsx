import Link from "next/link";
import { createClient, getPegawaiSaya, getKodeAksesSaya, punyaAkses } from "@/lib/supabase/server";
import { PERAN_LAB, STATUS_RUJUKAN_LAB, WARNA_STATUS_RUJUKAN_LAB } from "@/lib/lab";
import { waktuWib } from "@/lib/format";
import AksiRujukan from "./aksi-rujukan";

type Baris = {
  id: string;
  permintaan_id: string;
  nama_pemeriksaan: string;
  tujuan: string;
  alasan: string | null;
  status: string;
  dikirim_pada: string;
  dikirim_oleh_nama: string | null;
  hasil_teks: string | null;
  hasil_diterima_pada: string | null;
  hasil_dicatat_oleh_nama: string | null;
  permintaan: {
    no_lab: string;
    kunjungan: { pasien: { nama_lengkap: string; no_rm: string } | null } | null;
  } | null;
};

const TAB = [
  { kunci: "dikirim", label: "Menunggu hasil" },
  { kunci: "hasil_diterima", label: "Hasil diterima" },
  { kunci: "dibatalkan", label: "Dibatalkan" },
];

export default async function HalamanRujukanLab({ searchParams }: { searchParams: { status?: string } }) {
  const pemanggil = await getPegawaiSaya();
  const boleh = pemanggil && [...PERAN_LAB, "kapus"].includes(pemanggil.peran);
  if (!pemanggil || !boleh) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus Laboratorium, admin, dan Kepala Puskesmas.
      </div>
    );
  }
  const lab = PERAN_LAB.includes(pemanggil.peran);
  if (lab) {
    const kodeAkses = await getKodeAksesSaya(pemanggil.id, pemanggil.peran);
    if (!punyaAkses(kodeAkses, "lintas_lab")) {
      return (
        <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
          Akunmu belum dikasih akses ke Laboratorium. Minta admin nambahin akses klaster &quot;Lintas Klaster - Lab&quot; di
          halaman Data Pegawai.
        </div>
      );
    }
  }

  const status = TAB.some((t) => t.kunci === searchParams.status) ? (searchParams.status as string) : "dikirim";

  const supabase = createClient();
  const { data, error } = await supabase
    .from("lab_rujukan_keluar")
    .select(
      `id, permintaan_id, nama_pemeriksaan, tujuan, alasan, status, dikirim_pada, dikirim_oleh_nama,
       hasil_teks, hasil_diterima_pada, hasil_dicatat_oleh_nama,
       permintaan:permintaan_id (no_lab, kunjungan:kunjungan_id (pasien:pasien_id (nama_lengkap, no_rm)))`
    )
    .eq("status", status)
    .order("dikirim_pada", { ascending: status === "dikirim" })
    .limit(100);

  if (error) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Gagal memuat rujukan lab: {error.message}
        {error.message.includes("lab_rujukan_keluar") && " — jalankan migrasi_tahap_46.sql di Supabase dulu."}
      </div>
    );
  }
  const daftar = (data ?? []) as unknown as Baris[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Rujukan Lab Keluar</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Pemeriksaan yang dikirim ke RS atau lab luar. Rujukan dibuat dari halaman Input Hasil. Hasil dari luar dicatat di sini dan
          langsung terbaca klaster peminta.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TAB.map((t) => (
          <Link
            key={t.kunci}
            href={`/dashboard/lab/rujukan?status=${t.kunci}`}
            className={`rounded-sm px-3.5 py-2 text-sm font-semibold ${
              status === t.kunci ? "bg-teal-700 text-white" : "border border-sand-100 bg-white text-ink/70 hover:bg-sand-50"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {daftar.map((r) => {
          const pasien = r.permintaan?.kunjungan?.pasien;
          return (
            <div key={r.id} className="space-y-3 rounded-card border border-sand-100 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-extrabold text-ink">
                    {r.nama_pemeriksaan} <span className="font-medium text-ink/50">→ {r.tujuan}</span>
                  </p>
                  <p className="text-sm text-ink/70">
                    {pasien?.nama_lengkap ?? "Pasien"} · RM {pasien?.no_rm ?? "-"} ·{" "}
                    <Link
                      href={`/dashboard/lab/hasil/${r.permintaan_id}`}
                      className="font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
                    >
                      {r.permintaan?.no_lab ?? "permintaan"}
                    </Link>
                  </p>
                  <p className="mt-0.5 text-xs text-ink/50">
                    Dikirim {waktuWib(r.dikirim_pada)}
                    {r.dikirim_oleh_nama ? ` oleh ${r.dikirim_oleh_nama}` : ""}
                    {r.alasan ? ` · ${r.alasan}` : ""}
                  </p>
                </div>
                <span className={`rounded-sm px-2.5 py-1 text-xs font-semibold ${WARNA_STATUS_RUJUKAN_LAB[r.status] ?? "bg-ink/5 text-ink/70"}`}>
                  {STATUS_RUJUKAN_LAB[r.status] ?? r.status}
                </span>
              </div>

              {r.status === "hasil_diterima" && r.hasil_teks && (
                <p className="whitespace-pre-wrap rounded-sm bg-sand-50 px-3.5 py-2.5 text-sm text-ink/80">
                  {r.hasil_teks}
                  <span className="mt-1 block text-xs text-ink/45">
                    {r.hasil_diterima_pada ? `Diterima ${waktuWib(r.hasil_diterima_pada)}` : ""}
                    {r.hasil_dicatat_oleh_nama ? ` · dicatat ${r.hasil_dicatat_oleh_nama}` : ""}
                  </span>
                </p>
              )}

              {lab && r.status === "dikirim" && (
                <div className="border-t border-sand-100 pt-3">
                  <AksiRujukan id={r.id} />
                </div>
              )}
            </div>
          );
        })}
        {daftar.length === 0 && (
          <div className="rounded-card border border-sand-100 bg-white px-5 py-6 text-center text-sm text-ink/45">
            Tidak ada rujukan pada tab ini.
          </div>
        )}
      </div>
    </div>
  );
}
