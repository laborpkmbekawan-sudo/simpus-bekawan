import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ringkasTtv } from "@/lib/ttv";
import TombolCetak from "./tombol-cetak";

function umur(tanggalLahir: string | null) {
  if (!tanggalLahir) return "—";
  const lahir = new Date(tanggalLahir);
  const now = new Date();
  let u = now.getFullYear() - lahir.getFullYear();
  if (now.getMonth() < lahir.getMonth() || (now.getMonth() === lahir.getMonth() && now.getDate() < lahir.getDate())) u -= 1;
  return `${u} tahun`;
}

function Baris({ label, isi }: { label: string; isi: React.ReactNode }) {
  return (
    <tr>
      <td className="w-44 py-1 align-top text-ink/70">{label}</td>
      <td className="w-3 py-1 align-top">:</td>
      <td className="whitespace-pre-line py-1 align-top font-medium text-ink">{isi || "—"}</td>
    </tr>
  );
}

export default async function CetakRujukan({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: rujukan } = await supabase.from("rujukan").select("*").eq("id", params.id).maybeSingle();
  if (!rujukan) notFound();

  const [{ data: dari }, { data: ke }, { data: skrining }] = await Promise.all([
    supabase.from("lokasi").select("nama").eq("id", rujukan.dari_lokasi_id).maybeSingle(),
    rujukan.ke_lokasi_id
      ? supabase.from("lokasi").select("nama").eq("id", rujukan.ke_lokasi_id).maybeSingle()
      : Promise.resolve({ data: null }),
    rujukan.kunjungan_id
      ? supabase.from("skrining").select("*").eq("kunjungan_id", rujukan.kunjungan_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const tujuan = rujukan.jenis === "internal" ? ke?.nama : rujukan.tujuan_eksternal;
  const tanggal = new Date(rujukan.dibuat_pada).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  // Data klinis dari rujukan; rujukan lama (sebelum tahap 6) jatuh ke skrining kunjungan.
  const ttv = ringkasTtv({
    td_sistolik: rujukan.td_sistolik ?? skrining?.tekanan_darah_sistolik,
    td_diastolik: rujukan.td_diastolik ?? skrining?.tekanan_darah_diastolik,
    nadi: rujukan.nadi ?? skrining?.nadi,
    frekuensi_napas: rujukan.frekuensi_napas ?? skrining?.frekuensi_napas,
    suhu: rujukan.suhu ?? skrining?.suhu,
    spo2: rujukan.spo2,
    gcs: rujukan.gcs,
    berat_badan: rujukan.berat_badan ?? skrining?.berat_badan,
  });
  const keluhan = rujukan.keluhan_utama ?? skrining?.keluhan_utama;

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <TombolCetak />
      </div>

      <div className="mx-auto max-w-3xl rounded-card border border-sand-100 bg-white p-10 text-sm print:max-w-none print:rounded-none print:border-0 print:p-0">
        <div className="border-b-2 border-ink pb-3 text-center">
          <p className="text-base font-extrabold uppercase text-ink">UPTD Puskesmas Bekawan</p>
          <p className="text-xs text-ink/60">{dari?.nama ?? ""}</p>
        </div>

        <h1 className="mt-5 text-center text-lg font-extrabold uppercase text-ink">Surat Rujukan</h1>
        <p className="mb-5 text-center text-xs text-ink/50">{rujukan.jenis === "internal" ? "Rujukan Internal" : "Rujukan Eksternal"}</p>

        <p className="mb-3 text-ink">
          Kepada Yth.
          <br />
          <span className="font-semibold">{tujuan ?? "—"}</span>
          {rujukan.poli_tujuan ? <span> — {rujukan.poli_tujuan}</span> : null}
        </p>

        <p className="mb-2 text-ink">Mohon pemeriksaan dan penanganan lebih lanjut terhadap pasien:</p>

        <table className="mb-4 w-full">
          <tbody>
            <Baris label="Nama" isi={rujukan.pasien_nama} />
            <Baris label="No. RM" isi={rujukan.pasien_no_rm_asal} />
            <Baris label="Umur / Jenis kelamin" isi={`${umur(rujukan.pasien_tanggal_lahir)} / ${rujukan.pasien_jenis_kelamin === "L" ? "Laki-laki" : rujukan.pasien_jenis_kelamin === "P" ? "Perempuan" : "—"}`} />
            <Baris label="Alamat" isi={rujukan.pasien_alamat} />
            <Baris label="Penjamin" isi={rujukan.pasien_jenis_penjamin === "bpjs" ? `BPJS${rujukan.pasien_no_bpjs ? ` (${rujukan.pasien_no_bpjs})` : ""}` : "Umum"} />
            <Baris label="Alergi" isi={rujukan.pasien_alergi} />
          </tbody>
        </table>

        <table className="mb-6 w-full">
          <tbody>
            <Baris label="Keluhan utama" isi={keluhan} />
            <Baris label="Tanda vital" isi={ttv} />
            <Baris label="Pemeriksaan fisik" isi={rujukan.pemeriksaan_fisik} />
            <Baris label="Pemeriksaan penunjang" isi={rujukan.pemeriksaan_penunjang} />
            <Baris label="Diagnosis" isi={rujukan.diagnosis} />
            <Baris label="Terapi / tindakan yang sudah diberikan" isi={rujukan.terapi_diberikan} />
            <Baris label="Alasan dirujuk" isi={rujukan.alasan} />
          </tbody>
        </table>

        <p className="mb-10 text-ink">Demikian surat rujukan ini dibuat. Atas perhatian dan kerja samanya, diucapkan terima kasih.</p>

        <div className="ml-auto w-64 text-center text-ink">
          <p>Bekawan, {tanggal}</p>
          <p className="mb-16">Petugas yang merujuk,</p>
          <p className="border-t border-ink pt-1 text-xs text-ink/60">(nama & tanda tangan)</p>
        </div>
      </div>
    </div>
  );
}
