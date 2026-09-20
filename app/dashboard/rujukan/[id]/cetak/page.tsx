import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
      <td className="py-1 align-top font-medium text-ink">{isi || "—"}</td>
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

  const td =
    skrining?.tekanan_darah_sistolik != null && skrining?.tekanan_darah_diastolik != null
      ? `${skrining.tekanan_darah_sistolik}/${skrining.tekanan_darah_diastolik} mmHg`
      : null;
  const ttv = [
    td && `TD ${td}`,
    skrining?.nadi != null && `Nadi ${skrining.nadi} x/mnt`,
    skrining?.suhu != null && `Suhu ${skrining.suhu} °C`,
    skrining?.frekuensi_napas != null && `RR ${skrining.frekuensi_napas} x/mnt`,
    skrining?.berat_badan != null && `BB ${skrining.berat_badan} kg`,
  ]
    .filter(Boolean)
    .join(" · ");

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
            <Baris label="Keluhan utama" isi={skrining?.keluhan_utama} />
            <Baris label="Tanda vital" isi={ttv} />
            <Baris label="Diagnosis" isi={rujukan.diagnosis} />
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
