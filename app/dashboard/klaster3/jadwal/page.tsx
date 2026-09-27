import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import TabelJadwal, { type BarisJadwal, type PegawaiOpsi, type PosyanduOpsi } from "./tabel-jadwal";

type PosyanduMentah = { id: string; nama: string; lokasi: { nama: string } | null };

type JadwalMentah = {
  id: string;
  jenis_kegiatan: string;
  tanggal_pelaksanaan: string;
  jam_mulai: string | null;
  status: string;
  catatan: string | null;
  posyandu: { nama: string; lokasi: { nama: string } | null } | null;
  penanggung_jawab: { nama_lengkap: string } | null;
};

export default async function JadwalPosbinduLansia() {
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

  const [{ data: posyanduMentah }, { data: pegawaiMentah }, { data: jadwalMentah }] = await Promise.all([
    supabase.from("posyandu").select("id, nama, lokasi:lokasi_id (nama)").order("nama", { ascending: true }),
    supabase.from("pegawai").select("id, nama_lengkap").eq("status_aktif", true).order("nama_lengkap", { ascending: true }),
    supabase
      .from("jadwal_posbindu_lansia")
      .select(
        "id, jenis_kegiatan, tanggal_pelaksanaan, jam_mulai, status, catatan, posyandu:posyandu_id (nama, lokasi:lokasi_id (nama)), penanggung_jawab:penanggung_jawab_id (nama_lengkap)"
      )
      .order("tanggal_pelaksanaan", { ascending: false })
      .limit(300),
  ]);

  const posyanduOpsi: PosyanduOpsi[] = ((posyanduMentah ?? []) as unknown as PosyanduMentah[]).map((p) => ({
    id: p.id,
    nama: p.nama,
    lokasiNama: p.lokasi?.nama ?? "—",
  }));

  const pegawaiOpsi: PegawaiOpsi[] = (pegawaiMentah ?? []).map((p) => ({ id: p.id, nama: p.nama_lengkap }));

  const jadwal: BarisJadwal[] = ((jadwalMentah ?? []) as unknown as JadwalMentah[]).map((j) => ({
    id: j.id,
    jenisKegiatan: j.jenis_kegiatan,
    tanggalPelaksanaan: j.tanggal_pelaksanaan,
    jamMulai: j.jam_mulai,
    status: j.status,
    catatan: j.catatan,
    namaPosyandu: j.posyandu?.nama ?? "—",
    lokasiNama: j.posyandu?.lokasi?.nama ?? "—",
    namaPenanggungJawab: j.penanggung_jawab?.nama_lengkap ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Jadwal Posbindu & Posyandu Lansia — {klaster3.nama}</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Rencana kegiatan luar gedung per lokasi/posyandu, terpisah dari pencatatan hasil kegiatan.
        </p>
      </div>

      <TabelJadwal posyanduOpsi={posyanduOpsi} pegawaiOpsi={pegawaiOpsi} jadwal={jadwal} />
    </div>
  );
}
