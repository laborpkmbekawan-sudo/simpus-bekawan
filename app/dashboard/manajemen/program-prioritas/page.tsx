import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import BarisProgram from "./baris-program";

const PERAN_LIHAT = ["admin", "kapus", "manajemen"];

const PROGRAM: { kode: string; nama: string }[] = [
  { kode: "stunting", nama: "Penurunan Stunting (balita ditangani)" },
  { kode: "aki_akb", nama: "Penurunan Kematian Ibu & Bayi (AKI/AKB)" },
  { kode: "tbc", nama: "Penemuan & Pengobatan Kasus TBC" },
  { kode: "hiv_aids", nama: "Pengendalian HIV/AIDS" },
  { kode: "malaria", nama: "Pengendalian Malaria" },
  { kode: "kusta_frambusia", nama: "Eliminasi Kusta & Frambusia" },
  { kode: "imunisasi_dasar", nama: "Imunisasi Dasar Lengkap" },
  { kode: "ptm", nama: "Pengendalian PTM (Hipertensi & Diabetes)" },
  { kode: "kesehatan_jiwa", nama: "Kesehatan Jiwa (ODGJ Ditangani)" },
  { kode: "germas", nama: "GERMAS (Gerakan Masyarakat Hidup Sehat)" },
];

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default async function HalamanProgramPrioritas({
  searchParams,
}: {
  searchParams: { bulan?: string; tahun?: string };
}) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return null;

  if (!PERAN_LIHAT.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kapus, atau manajemen.
      </div>
    );
  }

  const sekarang = new Date();
  const bulan =
    Number(searchParams.bulan) >= 1 && Number(searchParams.bulan) <= 12
      ? Number(searchParams.bulan)
      : sekarang.getMonth() + 1;
  const tahun = Number(searchParams.tahun) >= 2020 ? Number(searchParams.tahun) : sekarang.getFullYear();

  const supabase = createClient();
  const { data } = await supabase
    .from("program_prioritas_capaian")
    .select("kode_program, sasaran, capaian, catatan")
    .eq("bulan", bulan)
    .eq("tahun", tahun);

  const perKode = new Map((data ?? []).map((d) => [d.kode_program, d]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Program Prioritas</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Capaian program prioritas nasional (stunting, AKI/AKB, TBC, HIV, malaria, dst), input manual per bulan.
        </p>
      </div>

      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-4 py-3 text-xs leading-relaxed text-clay-700">
        Angka di bawah <strong>diisi manual</strong> dari data program masing-masing, bukan dihitung otomatis dari
        kunjungan SIMPUS. Terpisah dari 12 indikator SPM — ini fokus ke program prioritas nasional yang dipantau
        rutin di level manajemen puskesmas.
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="bulan" className="text-sm font-bold text-ink/80">
            Bulan
          </label>
          <select id="bulan" name="bulan" defaultValue={bulan} className="rounded-sm border border-sand-100 px-3 py-2 text-sm">
            {NAMA_BULAN.map((n, i) => (
              <option key={n} value={i + 1}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="tahun" className="text-sm font-bold text-ink/80">
            Tahun
          </label>
          <input
            id="tahun"
            name="tahun"
            type="number"
            defaultValue={tahun}
            className="w-24 rounded-sm border border-sand-100 px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" className="rounded-sm bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900">
          Tampilkan
        </button>
      </form>

      <div className="rounded-card border border-sand-100 bg-white p-5">
        {PROGRAM.map((p) => {
          const baris = perKode.get(p.kode);
          return (
            <BarisProgram
              key={p.kode}
              bulan={bulan}
              tahun={tahun}
              kode={p.kode}
              nama={p.nama}
              sasaran={baris?.sasaran ?? null}
              capaian={baris?.capaian ?? null}
              catatan={baris?.catatan ?? null}
            />
          );
        })}
      </div>
    </div>
  );
}
