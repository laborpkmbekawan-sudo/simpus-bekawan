import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { hariIniWib, selisihHari } from "@/lib/format";
import FormTambahDokumen, { type PegawaiRingkas } from "./form-tambah-dokumen";
import BarisDokumen, { type DokumenBaris } from "./baris-dokumen";

const PERAN_LIHAT = ["admin", "kapus", "manajemen"];

export default async function HalamanManajemenSdm() {
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

  const [{ data: daftarPegawaiMentah }, { data: daftarDokumenMentah }] = await Promise.all([
    supabase.from("pegawai").select("id, nama_lengkap, jabatan, unit_kerja, peran, status_aktif").order("nama_lengkap"),
    supabase
      .from("pegawai_dokumen")
      .select("id, jenis, nomor, nama_dokumen, tanggal_kedaluwarsa, pegawai:pegawai_id (nama_lengkap)")
      .order("tanggal_kedaluwarsa", { ascending: true, nullsFirst: false }),
  ]);

  const daftarPegawai = (daftarPegawaiMentah ?? []) as {
    id: string;
    nama_lengkap: string;
    jabatan: string | null;
    unit_kerja: string | null;
    peran: string;
    status_aktif: boolean;
  }[];
  const daftarDokumen = (daftarDokumenMentah ?? []) as unknown as DokumenBaris[];

  const pegawaiUntukForm: PegawaiRingkas[] = daftarPegawai
    .filter((p) => p.status_aktif)
    .map((p) => ({ id: p.id, nama_lengkap: p.nama_lengkap }));

  const pegawaiAktif = daftarPegawai.filter((p) => p.status_aktif).length;
  const pegawaiNonaktif = daftarPegawai.length - pegawaiAktif;

  const perPeran = new Map<string, number>();
  for (const p of daftarPegawai) {
    if (!p.status_aktif) continue;
    perPeran.set(p.peran, (perPeran.get(p.peran) ?? 0) + 1);
  }

  const dokumenPerluPerhatian = daftarDokumen.filter((d) => {
    if (!d.tanggal_kedaluwarsa) return false;
    const sisa = selisihHari(hariIni, d.tanggal_kedaluwarsa);
    return sisa <= 60;
  });

  const kartu = [
    { label: "Pegawai Aktif", nilai: pegawaiAktif },
    { label: "Pegawai Nonaktif", nilai: pegawaiNonaktif },
    { label: "Jenis Peran Aktif", nilai: perPeran.size },
    { label: "Dokumen Perlu Perhatian", nilai: dokumenPerluPerhatian.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Manajemen SDM</h1>
        <p className="mt-1.5 text-sm text-ink/60">Data pegawai, komposisi peran, dan dokumen kredensial (STR/SIP/SIK/pelatihan).</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kartu.map((k) => (
          <div key={k.label} className="rounded-card border border-sand-100 bg-white p-4">
            <p className="text-xs font-medium text-ink/50">{k.label}</p>
            <p className="mt-1 text-xl font-extrabold text-ink">{k.nilai}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <p className="border-b border-sand-100 px-4 py-3 text-sm font-bold text-ink">Komposisi Peran (Aktif)</p>
        <table className="w-full text-left text-sm">
          <tbody>
            {[...perPeran.entries()].map(([peran, jumlah]) => (
              <tr key={peran} className="border-b border-sand-100/70 last:border-0">
                <td className="px-4 py-2.5 text-ink">{peran}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-ink">{jumlah}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="rounded-card border border-sand-100 bg-white p-5">
        <h2 className="mb-4 text-base font-bold text-ink">Tambah Dokumen Kredensial</h2>
        <FormTambahDokumen daftarPegawai={pegawaiUntukForm} />
      </section>

      <div className="space-y-3">
        <p className="text-sm font-bold text-ink">Dokumen Perlu Perhatian (≤60 hari / sudah lewat)</p>
        {dokumenPerluPerhatian.map((d) => (
          <BarisDokumen
            key={d.id}
            dokumen={d}
            sisaHari={d.tanggal_kedaluwarsa ? selisihHari(hariIni, d.tanggal_kedaluwarsa) : null}
          />
        ))}
        {dokumenPerluPerhatian.length === 0 && (
          <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/45">
            Tidak ada dokumen yang mau kedaluwarsa dalam 60 hari.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-bold text-ink">Semua Dokumen Kredensial</p>
        {daftarDokumen.map((d) => (
          <BarisDokumen
            key={d.id}
            dokumen={d}
            sisaHari={d.tanggal_kedaluwarsa ? selisihHari(hariIni, d.tanggal_kedaluwarsa) : null}
          />
        ))}
        {daftarDokumen.length === 0 && (
          <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/45">Belum ada dokumen tercatat.</p>
        )}
      </div>
    </div>
  );
}
