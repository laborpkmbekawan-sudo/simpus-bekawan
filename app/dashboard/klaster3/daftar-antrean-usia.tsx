import Link from "next/link";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { hariIniWib } from "@/lib/format";

type KunjunganMentah = {
  id: string;
  nomor_antrian: number;
  status: "menunggu" | "dipanggil" | "selesai";
  jenis_kunjungan: string;
  pasien: { id: string; nama_lengkap: string; no_rm: string; tanggal_lahir: string | null } | null;
};

const LABEL_STATUS: Record<string, string> = {
  menunggu: "Menunggu",
  dipanggil: "Dipanggil",
  selesai: "Selesai",
};

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

export default async function DaftarAntreanUsiaKlaster3({
  kelompokUsia,
  judul,
  keterangan,
}: {
  kelompokUsia: "dewasa" | "lansia";
  judul: string;
  keterangan: string;
}) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return null;

  const supabase = createClient();
  const { data: klaster3 } = await supabase.from("klaster").select("id, nama").eq("kode", "klaster_3").maybeSingle();

  if (!klaster3) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Klaster dengan kode "klaster_3" belum ada di Master Data.
      </div>
    );
  }

  let bolehLihat = ["admin", "kapus"].includes(pemanggil.peran);
  if (!bolehLihat) {
    const { data: akses } = await supabase
      .from("akses_klaster")
      .select("id")
      .eq("pegawai_id", pemanggil.id)
      .eq("klaster_id", klaster3.id)
      .maybeSingle();
    bolehLihat = !!akses;
  }

  if (!bolehLihat) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kapus, atau pegawai dengan akses Klaster 3.
      </div>
    );
  }

  const hariIni = hariIniWib();
  const { data: kunjunganMentah } = await supabase
    .from("kunjungan")
    .select("id, nomor_antrian, status, jenis_kunjungan, pasien:pasien_id (id, nama_lengkap, no_rm, tanggal_lahir)")
    .eq("klaster_tujuan_id", klaster3.id)
    .eq("tanggal", hariIni)
    .order("nomor_antrian", { ascending: true });

  const semua = (kunjunganMentah ?? []) as unknown as KunjunganMentah[];
  const sesuaiKelompok = semua.filter((k) => {
    const umur = umurAngka(k.pasien?.tanggal_lahir ?? null);
    const iniLansia = (umur ?? 0) >= 60;
    return kelompokUsia === "lansia" ? iniLansia : !iniLansia;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">{judul}</h1>
        <p className="mt-1.5 text-sm text-ink/60">{keterangan}</p>
      </div>

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-5 py-3 font-medium">No.</th>
              <th className="px-5 py-3 font-medium">Pasien</th>
              <th className="px-5 py-3 font-medium">No. RM</th>
              <th className="px-5 py-3 font-medium">Jenis</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {sesuaiKelompok.map((k) => (
              <tr key={k.id} className="border-b border-sand-100/70 last:border-0">
                <td className="px-5 py-3.5 text-ink/70">{k.nomor_antrian}</td>
                <td className="px-5 py-3.5 font-medium text-ink">{k.pasien?.nama_lengkap ?? "—"}</td>
                <td className="px-5 py-3.5 text-ink/70">{k.pasien?.no_rm ?? "—"}</td>
                <td className="px-5 py-3.5 text-ink/70">{k.jenis_kunjungan}</td>
                <td className="px-5 py-3.5 text-ink/70">{LABEL_STATUS[k.status]}</td>
                <td className="px-5 py-3.5 text-right">
                  {k.status === "selesai" ? (
                    <Link
                      href={`/dashboard/rekam-medis/${k.pasien?.id}`}
                      className="text-xs font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
                    >
                      Rekam Medis
                    </Link>
                  ) : (
                    <Link
                      href={`/dashboard/pelayanan/${k.id}`}
                      className="text-xs font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
                    >
                      Buka Pelayanan
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {sesuaiKelompok.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-sm text-ink/45">
                  Gak ada kunjungan kelompok ini yang terdaftar hari ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
