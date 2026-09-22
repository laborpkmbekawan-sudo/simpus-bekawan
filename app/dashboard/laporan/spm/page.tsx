import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import BarisSpm from "./baris-spm";
import TombolCetak from "./tombol-cetak";

const PERAN_LAPORAN = ["admin", "kapus"];

const INDIKATOR: { kode: string; nama: string }[] = [
  { kode: "spm_01", nama: "Pelayanan kesehatan ibu hamil" },
  { kode: "spm_02", nama: "Pelayanan kesehatan ibu bersalin" },
  { kode: "spm_03", nama: "Pelayanan kesehatan bayi baru lahir" },
  { kode: "spm_04", nama: "Pelayanan kesehatan balita" },
  { kode: "spm_05", nama: "Pelayanan kesehatan pada usia pendidikan dasar" },
  { kode: "spm_06", nama: "Pelayanan kesehatan pada usia produktif" },
  { kode: "spm_07", nama: "Pelayanan kesehatan pada usia lanjut" },
  { kode: "spm_08", nama: "Pelayanan kesehatan penderita hipertensi" },
  { kode: "spm_09", nama: "Pelayanan kesehatan penderita diabetes melitus" },
  { kode: "spm_10", nama: "Pelayanan kesehatan orang dengan gangguan jiwa berat" },
  { kode: "spm_11", nama: "Pelayanan kesehatan orang terduga tuberkulosis" },
  { kode: "spm_12", nama: "Pelayanan kesehatan orang dengan risiko terinfeksi HIV" },
];

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default async function LaporanSpm({
  searchParams,
}: {
  searchParams: { bulan?: string; tahun?: string };
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

  const sekarang = new Date();
  const bulan = Number(searchParams.bulan) >= 1 && Number(searchParams.bulan) <= 12
    ? Number(searchParams.bulan)
    : sekarang.getMonth() + 1;
  const tahun = Number(searchParams.tahun) >= 2020 ? Number(searchParams.tahun) : sekarang.getFullYear();

  const supabase = createClient();
  const { data } = await supabase
    .from("spm_capaian")
    .select("kode_indikator, jumlah_capaian, jumlah_target, catatan")
    .eq("bulan", bulan)
    .eq("tahun", tahun);

  const perKode = new Map((data ?? []).map((d) => [d.kode_indikator, d]));

  return (
    <div className="space-y-6">
      <div className="hidden text-center print:block">
        <p className="text-base font-bold">UPTD PUSKESMAS BEKAWAN</p>
        <p className="text-sm">Capaian SPM Bidang Kesehatan</p>
        <p className="text-sm">Periode {NAMA_BULAN[bulan - 1]} {tahun}</p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Laporan SPM Bidang Kesehatan</h1>
          <p className="mt-1.5 text-sm text-ink/60">12 indikator SPM (Permenkes 4/2019), input manual per bulan.</p>
        </div>
        <TombolCetak />
      </div>

      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-4 py-3 text-xs leading-relaxed text-clay-700 print:hidden">
        Angka di bawah <strong>diisi manual</strong>, bukan dihitung otomatis dari data kunjungan SIMPUS.
        Sebagian besar indikator ini butuh data program tersendiri (ANC per kehamilan, imunisasi, skrining
        PTM, program TB/HIV/ODGJ, dst) yang belum tercatat di sistem ini — jadi hitung dulu di program
        masing-masing, baru masukkan capaian/targetnya ke sini biar terekap rapi dan bisa dicetak.
      </div>

      <form className="flex flex-wrap items-end gap-3 print:hidden">
        <div className="space-y-1.5">
          <label htmlFor="bulan" className="text-sm font-bold text-ink/80">Bulan</label>
          <select id="bulan" name="bulan" defaultValue={bulan} className="rounded-sm border border-sand-100 px-3 py-2 text-sm">
            {NAMA_BULAN.map((n, i) => (
              <option key={n} value={i + 1}>{n}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="tahun" className="text-sm font-bold text-ink/80">Tahun</label>
          <input id="tahun" name="tahun" type="number" defaultValue={tahun} className="w-24 rounded-sm border border-sand-100 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-sm bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900">
          Tampilkan
        </button>
      </form>

      <div className="rounded-card border border-sand-100 bg-white p-5 print:border-0 print:p-0">
        {INDIKATOR.map((ind) => {
          const baris = perKode.get(ind.kode);
          return (
            <BarisSpm
              key={ind.kode}
              bulan={bulan}
              tahun={tahun}
              kode={ind.kode}
              nama={ind.nama}
              capaian={baris?.jumlah_capaian ?? null}
              target={baris?.jumlah_target ?? null}
              catatan={baris?.catatan ?? null}
            />
          );
        })}
      </div>
    </div>
  );
}
