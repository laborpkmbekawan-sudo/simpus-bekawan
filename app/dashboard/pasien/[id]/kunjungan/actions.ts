"use server";

import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function daftarKunjunganAction(
  _sebelum: { pesan: string; sukses: boolean; nomorTampil?: string; namaKlaster?: string } | null,
  formData: FormData
): Promise<{ pesan: string; sukses: boolean; nomorTampil?: string; namaKlaster?: string }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) {
    return { pesan: "Sesi login gak ditemukan, coba masuk ulang.", sukses: false };
  }

  const pasienId = String(formData.get("pasien_id") ?? "");
  const klasterTujuanId = String(formData.get("klaster_tujuan_id") ?? "");
  const jenisKunjungan = String(formData.get("jenis_kunjungan") ?? "");
  const keluhanUtama = String(formData.get("keluhan_utama") ?? "").trim();
  const tdSistolik = String(formData.get("td_sistolik") ?? "").trim();
  const tdDiastolik = String(formData.get("td_diastolik") ?? "").trim();
  const nadi = String(formData.get("nadi") ?? "").trim();
  const suhu = String(formData.get("suhu") ?? "").trim();
  const frekuensiNapas = String(formData.get("frekuensi_napas") ?? "").trim();
  const prioritasTriase = String(formData.get("prioritas_triase") ?? "hijau");

  if (!pasienId || !klasterTujuanId || !jenisKunjungan) {
    return { pesan: "Jenis kunjungan dan klaster tujuan wajib diisi.", sukses: false };
  }

  const supabase = createClient();
  const hariIni = new Date().toISOString().slice(0, 10);

  // Hitung nomor antrian: jumlah kunjungan hari ini ke klaster yang sama + 1.
  // Direset otomatis tiap hari karena filter tanggal = hari ini.
  const { count } = await supabase
    .from("kunjungan")
    .select("id", { count: "exact", head: true })
    .eq("klaster_tujuan_id", klasterTujuanId)
    .eq("tanggal", hariIni);

  const nomorAntrian = (count ?? 0) + 1;

  const { data: klaster } = await supabase
    .from("klaster")
    .select("nama, kode_antrian")
    .eq("id", klasterTujuanId)
    .single();

  const nomorTampil = klaster?.kode_antrian
    ? `${klaster.kode_antrian}-${String(nomorAntrian).padStart(2, "0")}`
    : String(nomorAntrian);

  const { data: kunjunganBaru, error } = await supabase
    .from("kunjungan")
    .insert({
      pasien_id: pasienId,
      klaster_tujuan_id: klasterTujuanId,
      jenis_kunjungan: jenisKunjungan,
      nomor_antrian: nomorAntrian,
      tanggal: hariIni,
      dibuat_oleh: pemanggil.id,
    })
    .select("id")
    .single();

  if (error || !kunjunganBaru) {
    return { pesan: `Gagal mendaftarkan kunjungan: ${error?.message}`, sukses: false };
  }

  // Simpan skrining awal terhubung ke kunjungan yang baru dibuat. Kalau
  // gagal, kunjungan tetap tersimpan -- kasih tau apa adanya, bukan rollback,
  // supaya pasien tetap dapat nomor antrian walau skrining perlu diulang.
  const { error: errorSkrining } = await supabase.from("skrining").insert({
    kunjungan_id: kunjunganBaru.id,
    keluhan_utama: keluhanUtama || null,
    tekanan_darah_sistolik: tdSistolik ? Number(tdSistolik) : null,
    tekanan_darah_diastolik: tdDiastolik ? Number(tdDiastolik) : null,
    nadi: nadi ? Number(nadi) : null,
    suhu: suhu ? Number(suhu) : null,
    frekuensi_napas: frekuensiNapas ? Number(frekuensiNapas) : null,
    prioritas_triase: prioritasTriase === "kuning" || prioritasTriase === "merah" ? prioritasTriase : "hijau",
    dibuat_oleh: pemanggil.id,
  });

  revalidatePath("/dashboard/pasien");

  if (errorSkrining) {
    return {
      pesan: `Kunjungan tersimpan (No. antrian ${nomorTampil}), tapi skrining gagal disimpan: ${errorSkrining.message}`,
      sukses: true,
      nomorTampil,
      namaKlaster: klaster?.nama ?? "",
    };
  }

  return {
    pesan: "Kunjungan dan skrining berhasil didaftarkan.",
    sukses: true,
    nomorTampil,
    namaKlaster: klaster?.nama ?? "",
  };
}
