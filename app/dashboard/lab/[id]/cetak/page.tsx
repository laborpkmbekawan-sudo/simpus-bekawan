import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { PERAN_KLINIS_LAB, PERAN_LAB, umurTahun } from "@/lib/lab";
import { TabelHasilLab, type ItemHasil } from "../../komponen";
import TombolCetak from "./tombol-cetak";
import { waktuWib } from "@/lib/format";

type ItemDb = {
  id: string;
  dibatalkan: boolean;
  pemeriksaan: { nama: string } | null;
  hasil: ItemHasil["hasil"];
};

function Baris({ label, isi }: { label: string; isi: React.ReactNode }) {
  return (
    <tr>
      <td className="w-40 py-0.5 align-top text-ink/70">{label}</td>
      <td className="w-3 py-0.5 align-top">:</td>
      <td className="py-0.5 align-top font-medium text-ink">{isi || "—"}</td>
    </tr>
  );
}

export default async function CetakHasilLab({ params }: { params: { id: string } }) {
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
  const { data: p } = await supabase
    .from("lab_permintaan")
    .select(
      `id, no_lab, status, prioritas, diagnosis_kerja, catatan_validasi, diminta_oleh_nama, diminta_pada,
       divalidasi_oleh_nama, divalidasi_pada,
       kunjungan:kunjungan_id (
         pasien:pasien_id (nama_lengkap, no_rm, jenis_kelamin, tanggal_lahir, alamat_desa),
         klaster:klaster_tujuan_id (nama)
       )`
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!p) notFound();

  if (p.status !== "selesai") {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-sand-100 bg-white p-8 text-center">
        <p className="text-lg font-bold text-ink">Hasil belum bisa dicetak</p>
        <p className="mt-2 text-sm text-ink/60">Cetakan hanya tersedia setelah hasil divalidasi Laboratorium.</p>
        <Link
          href={`/dashboard/lab/hasil/${p.id}`}
          className="mt-5 inline-block rounded-sm bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900"
        >
          Kembali
        </Link>
      </div>
    );
  }

  const { data: itemMentah } = await supabase
    .from("lab_permintaan_item")
    .select("id, dibatalkan, pemeriksaan:pemeriksaan_id (nama), hasil:lab_hasil (id, nama_parameter, satuan, rujukan_teks, nilai, flag, catatan, parameter:parameter_id (urutan))")
    .eq("permintaan_id", p.id);

  const kunj = p.kunjungan as unknown as {
    pasien: { nama_lengkap: string; no_rm: string; jenis_kelamin: string | null; tanggal_lahir: string | null; alamat_desa: string | null } | null;
    klaster: { nama: string } | null;
  } | null;
  const pasien = kunj?.pasien;

  const items: ItemHasil[] = ((itemMentah ?? []) as unknown as ItemDb[])
    .filter((i) => !i.dibatalkan)
    .map((i) => ({ id: i.id, nama: i.pemeriksaan?.nama ?? "—", hasil: i.hasil }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 print:hidden">
        <TombolCetak />
        <Link
          href={`/dashboard/lab/hasil/${p.id}`}
          className="text-sm font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
        >
          ← Kembali
        </Link>
      </div>

      <div className="mx-auto max-w-3xl rounded-card border border-sand-100 bg-white p-10 text-sm print:max-w-none print:rounded-none print:border-0 print:p-0">
        <div className="border-b-2 border-ink pb-3 text-center">
          <p className="text-base font-extrabold uppercase text-ink">UPTD Puskesmas Bekawan</p>
          <p className="text-xs text-ink/60">Unit Laboratorium</p>
        </div>

        <h1 className="mt-5 text-center text-lg font-extrabold uppercase text-ink">Hasil Pemeriksaan Laboratorium</h1>
        <p className="mb-5 text-center text-xs text-ink/50">{p.no_lab}</p>

        <table className="mb-5 w-full">
          <tbody>
            <Baris label="Nama" isi={pasien?.nama_lengkap} />
            <Baris label="No. RM" isi={pasien?.no_rm} />
            <Baris
              label="Umur / Jenis kelamin"
              isi={`${umurTahun(pasien?.tanggal_lahir ?? null)} / ${pasien?.jenis_kelamin === "L" ? "Laki-laki" : pasien?.jenis_kelamin === "P" ? "Perempuan" : "—"}`}
            />
            <Baris label="Asal permintaan" isi={`${kunj?.klaster?.nama ?? ""}${p.diminta_oleh_nama ? ` (${p.diminta_oleh_nama})` : ""}`} />
            <Baris label="Diagnosis kerja" isi={p.diagnosis_kerja} />
            <Baris label="Tanggal diminta" isi={waktuWib(p.diminta_pada)} />
          </tbody>
        </table>

        <TabelHasilLab items={items} />

        {p.catatan_validasi && (
          <p className="mt-4 text-ink/80">
            <span className="font-bold">Catatan:</span> {p.catatan_validasi}
          </p>
        )}

        <p className="mt-4 text-xs text-ink/50">
          Hasil di luar nilai rujukan diberi keterangan Rendah/Tinggi/Abnormal. Nilai rujukan sesuai jenis kelamin pasien.
        </p>

        <div className="ml-auto mt-8 w-64 text-center text-ink">
          <p>Bekawan, {p.divalidasi_pada ? waktuWib(p.divalidasi_pada) : ""}</p>
          <p className="mb-14">Petugas Laboratorium,</p>
          <p className="border-t border-ink pt-1 text-xs font-semibold text-ink">{p.divalidasi_oleh_nama ?? "(nama & tanda tangan)"}</p>
        </div>
      </div>
    </div>
  );
}
