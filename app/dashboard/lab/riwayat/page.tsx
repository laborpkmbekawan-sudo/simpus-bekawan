import Link from "next/link";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { PERAN_KLINIS_LAB, PERAN_LAB, LABEL_FLAG, WARNA_FLAG, umurTahun } from "@/lib/lab";
import CariPasien from "../../farmasi/riwayat/cari-pasien";
import Sparkline from "./sparkline";

const MAKS_KOLOM = 8;

type HasilDb = {
  parameter_id: string;
  nama_parameter: string;
  satuan: string | null;
  rujukan_teks: string | null;
  nilai: string;
  flag: string | null;
};

type PermintaanDb = {
  id: string;
  no_lab: string;
  divalidasi_pada: string | null;
  items: {
    id: string;
    dibatalkan: boolean;
    pemeriksaan: { id: string; nama: string } | null;
    hasil: HasilDb[];
  }[];
};

type Sel = { nilai: string; flag: string | null };

function tanggalPendek(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function keAngka(nilai: string): number | null {
  const n = Number(nilai.trim().replace(",", "."));
  return Number.isNaN(n) || nilai.trim() === "" ? null : n;
}

export default async function HalamanRiwayatLab({ searchParams }: { searchParams: { pasien_id?: string } }) {
  const pemanggil = await getPegawaiSaya();
  const boleh = pemanggil && [...PERAN_LAB, ...PERAN_KLINIS_LAB, "kapus"].includes(pemanggil.peran);
  if (!pemanggil || !boleh) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini untuk petugas layanan dan Laboratorium.
      </div>
    );
  }

  const supabase = createClient();
  const { data: semuaPasien } = await supabase.from("pasien").select("id, no_rm, nama_lengkap").order("nama_lengkap");

  const pasienId = searchParams.pasien_id ?? "";
  let pasien: { nama_lengkap: string; no_rm: string; jenis_kelamin: string | null; tanggal_lahir: string | null } | null = null;
  let daftar: PermintaanDb[] = [];
  let galat: string | null = null;

  if (pasienId) {
    const [{ data: p }, { data, error }] = await Promise.all([
      supabase.from("pasien").select("nama_lengkap, no_rm, jenis_kelamin, tanggal_lahir").eq("id", pasienId).maybeSingle(),
      supabase
        .from("lab_permintaan")
        .select(
          `id, no_lab, divalidasi_pada,
           kunjungan:kunjungan_id!inner (pasien_id),
           items:lab_permintaan_item (
             id, dibatalkan,
             pemeriksaan:pemeriksaan_id (id, nama),
             hasil:lab_hasil (parameter_id, nama_parameter, satuan, rujukan_teks, nilai, flag)
           )`
        )
        .eq("status", "selesai")
        .eq("kunjungan.pasien_id", pasienId)
        .order("divalidasi_pada", { ascending: true })
        .limit(200),
    ]);
    pasien = p;
    daftar = (data ?? []) as unknown as PermintaanDb[];
    galat = error?.message ?? null;
  }

  // Kelompokkan: pemeriksaan -> daftar permintaan (kolom) + parameter (baris).
  type Kelompok = {
    id: string;
    nama: string;
    kolom: { permintaanId: string; noLab: string; tanggal: string }[];
    baris: Map<string, { nama: string; satuan: string | null; rujukan: string | null; sel: Map<string, Sel> }>;
  };
  const kelompok = new Map<string, Kelompok>();
  for (const p of daftar) {
    if (!p.divalidasi_pada) continue;
    for (const i of p.items) {
      if (i.dibatalkan || !i.pemeriksaan || i.hasil.length === 0) continue;
      const g =
        kelompok.get(i.pemeriksaan.id) ??
        ({ id: i.pemeriksaan.id, nama: i.pemeriksaan.nama, kolom: [], baris: new Map() } as Kelompok);
      g.kolom.push({ permintaanId: p.id, noLab: p.no_lab, tanggal: p.divalidasi_pada });
      for (const h of i.hasil) {
        const b = g.baris.get(h.parameter_id) ?? {
          nama: h.nama_parameter,
          satuan: h.satuan,
          rujukan: h.rujukan_teks,
          sel: new Map<string, Sel>(),
        };
        // Data diurutkan lama -> baru, jadi nilai terakhir menimpa: rujukan/satuan terbaru dipakai.
        b.nama = h.nama_parameter;
        b.satuan = h.satuan;
        b.rujukan = h.rujukan_teks;
        b.sel.set(p.id, { nilai: h.nilai, flag: h.flag });
        g.baris.set(h.parameter_id, b);
      }
      kelompok.set(i.pemeriksaan.id, g);
    }
  }
  const daftarKelompok = [...kelompok.values()].sort((a, b) => a.nama.localeCompare(b.nama, "id"));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Riwayat & Tren Hasil Lab</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Bandingkan hasil laboratorium satu pasien dari waktu ke waktu. Hanya hasil yang sudah divalidasi yang tampil.
        </p>
      </div>

      <CariPasien semuaPasien={semuaPasien ?? []} />

      {!pasienId && (
        <div className="rounded-card border border-sand-100 bg-white px-5 py-6 text-center text-sm text-ink/45">
          Cari pasien dulu untuk melihat riwayat hasil labnya.
        </div>
      )}

      {pasienId && !pasien && (
        <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
          Pasien gak ditemukan.
        </div>
      )}

      {galat && (
        <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
          Gagal memuat riwayat lab: {galat}
        </div>
      )}

      {pasien && (
        <section className="rounded-card border border-sand-100 bg-white p-5">
          <p className="text-lg font-bold text-ink">{pasien.nama_lengkap}</p>
          <p className="text-sm text-ink/60">
            No. RM {pasien.no_rm} · {pasien.jenis_kelamin === "L" ? "Laki-laki" : pasien.jenis_kelamin === "P" ? "Perempuan" : "—"} ·{" "}
            {umurTahun(pasien.tanggal_lahir)}
          </p>
          <p className="mt-1 text-xs text-ink/45">
            {daftar.length} permintaan lab selesai
            {daftar.length >= 200 ? " (200 terbaru yang dimuat)" : ""}
          </p>
        </section>
      )}

      {pasien && !galat && daftarKelompok.length === 0 && (
        <div className="rounded-card border border-sand-100 bg-white px-5 py-6 text-center text-sm text-ink/45">
          Pasien ini belum punya hasil lab yang tervalidasi.
        </div>
      )}

      {daftarKelompok.map((g) => {
        const kolom = g.kolom.slice(-MAKS_KOLOM);
        const terpotong = g.kolom.length > MAKS_KOLOM;
        return (
          <section key={g.id} className="space-y-3 rounded-card border border-sand-100 bg-white p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-bold text-ink">{g.nama}</h2>
              <p className="text-xs text-ink/45">
                {g.kolom.length}x diperiksa{terpotong ? ` · menampilkan ${MAKS_KOLOM} terakhir` : ""}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                    <th className="py-2 pr-4 font-medium">Parameter</th>
                    <th className="py-2 pr-4 font-medium">Rujukan</th>
                    {kolom.map((k) => (
                      <th key={k.permintaanId} className="whitespace-nowrap py-2 pr-4 font-medium">
                        <Link
                          href={`/dashboard/lab/hasil/${k.permintaanId}`}
                          className="underline decoration-ink/20 underline-offset-2 hover:text-teal-700"
                          title={k.noLab}
                        >
                          {tanggalPendek(k.tanggal)}
                        </Link>
                      </th>
                    ))}
                    <th className="py-2 font-medium">Tren</th>
                  </tr>
                </thead>
                <tbody>
                  {[...g.baris.entries()].map(([parameterId, b]) => {
                    const titik = kolom
                      .map((k) => b.sel.get(k.permintaanId))
                      .filter((s): s is Sel => !!s)
                      .map((s) => ({ nilai: keAngka(s.nilai), flag: s.flag }))
                      .filter((t): t is { nilai: number; flag: string | null } => t.nilai !== null);
                    return (
                      <tr key={parameterId} className="border-b border-sand-100/70 last:border-0">
                        <td className="py-2.5 pr-4 text-ink">
                          {b.nama}
                          {b.satuan && <span className="ml-1 text-xs text-ink/40">{b.satuan}</span>}
                        </td>
                        <td className="whitespace-nowrap py-2.5 pr-4 text-ink/55">{b.rujukan || "—"}</td>
                        {kolom.map((k) => {
                          const s = b.sel.get(k.permintaanId);
                          return (
                            <td key={k.permintaanId} className="whitespace-nowrap py-2.5 pr-4">
                              {s ? (
                                <span className={s.flag ? WARNA_FLAG[s.flag] : "text-ink"}>
                                  {s.nilai}
                                  {s.flag && s.flag !== "normal" && (
                                    <span className="ml-1 text-[10px] uppercase">{LABEL_FLAG[s.flag]}</span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-ink/30">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2.5">
                          <Sparkline titik={titik} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
