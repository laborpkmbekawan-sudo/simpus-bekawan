"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { hariIniWib, tanggalValid } from "@/lib/format";
import { PERAN_LAB, PERAN_MINTA_LAB, hitungFlag, hitungKritis, teksRujukan, type ParameterLab } from "@/lib/lab";

type Hasil = { pesan: string; sukses: boolean };

function segarkan() {
  revalidatePath("/dashboard/lab");
  revalidatePath("/dashboard/lab/hasil");
  revalidatePath("/dashboard/lab/katalog");
  revalidatePath("/dashboard/antrian");
}

// ---------------------------------------------------------------------------
// FITUR 1a -- Katalog pemeriksaan (Lab/admin)
// ---------------------------------------------------------------------------

type ParameterMentah = {
  nama: string;
  satuan: string;
  tipe: string;
  pilihan: string;
  pilihan_normal: string;
  min_l: string;
  max_l: string;
  min_p: string;
  max_p: string;
};

function angkaAtauNull(v: string) {
  const t = (v ?? "").trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isNaN(n) ? null : n;
}

export async function simpanPemeriksaanAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh ubah katalog pemeriksaan.", sukses: false };
  }

  const nama = String(formData.get("nama") ?? "").trim();
  const kode = String(formData.get("kode") ?? "").trim().toUpperCase();
  const kategori = String(formData.get("kategori") ?? "Lainnya").trim() || "Lainnya";
  const jenisSampel = String(formData.get("jenis_sampel") ?? "").trim();
  const tarifId = String(formData.get("tarif_layanan_id") ?? "").trim();

  let parameterMentah: ParameterMentah[] = [];
  try {
    parameterMentah = JSON.parse(String(formData.get("parameter") ?? "[]"));
  } catch {
    return { pesan: "Data parameter gak kebaca, coba lagi.", sukses: false };
  }

  if (!nama) return { pesan: "Nama pemeriksaan wajib diisi.", sukses: false };

  const parameter = parameterMentah.filter((p) => p.nama.trim());
  if (parameter.length === 0) return { pesan: "Tambah minimal satu parameter hasil.", sukses: false };

  for (const p of parameter) {
    if (p.tipe === "pilihan" && p.pilihan.split(",").map((x) => x.trim()).filter(Boolean).length < 2) {
      return { pesan: `Parameter "${p.nama}" bertipe pilihan, isi minimal dua pilihan (pisah koma).`, sukses: false };
    }
  }

  const supabase = createClient();

  const { data: baru, error } = await supabase
    .from("lab_pemeriksaan")
    .insert({
      nama,
      kode: kode || null,
      kategori,
      jenis_sampel: jenisSampel || null,
      tarif_layanan_id: tarifId || null,
    })
    .select("id")
    .single();

  if (error || !baru) {
    if (error?.code === "23505") return { pesan: `Kode "${kode}" sudah dipakai pemeriksaan lain.`, sukses: false };
    return { pesan: `Gagal simpan pemeriksaan: ${error?.message}`, sukses: false };
  }

  const baris = parameter.map((p, i) => {
    const pilihan = p.tipe === "pilihan" ? p.pilihan.split(",").map((x) => x.trim()).filter(Boolean) : null;
    const normal = p.tipe === "pilihan" && p.pilihan_normal.trim() && pilihan?.includes(p.pilihan_normal.trim())
      ? p.pilihan_normal.trim()
      : null;
    const tipe = ["angka", "pilihan", "teks"].includes(p.tipe) ? p.tipe : "angka";
    return {
      pemeriksaan_id: baru.id,
      nama: p.nama.trim(),
      satuan: p.satuan.trim() || null,
      tipe,
      pilihan,
      pilihan_normal: normal,
      min_l: tipe === "angka" ? angkaAtauNull(p.min_l) : null,
      max_l: tipe === "angka" ? angkaAtauNull(p.max_l) : null,
      min_p: tipe === "angka" ? angkaAtauNull(p.min_p) : null,
      max_p: tipe === "angka" ? angkaAtauNull(p.max_p) : null,
      urutan: i + 1,
    };
  });

  const { error: errorParam } = await supabase.from("lab_parameter").insert(baris);
  if (errorParam) {
    // Jangan sisakan pemeriksaan kosong tanpa parameter.
    await supabase.from("lab_pemeriksaan").delete().eq("id", baru.id);
    return { pesan: `Gagal simpan parameter: ${errorParam.message}`, sukses: false };
  }

  segarkan();
  return { pesan: `Pemeriksaan "${nama}" ditambahkan ke katalog.`, sukses: true };
}

// FITUR 5 -- resep BHP/reagen per pemeriksaan.
export async function tambahResepBhpLabAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh atur BHP pemeriksaan.", sukses: false };
  }
  const pemeriksaanId = String(formData.get("pemeriksaan_id") ?? "");
  const bhpId = String(formData.get("bhp_id") ?? "");
  const jumlah = Number(String(formData.get("jumlah_default") ?? "1").replace(",", "."));

  if (!pemeriksaanId || !bhpId) return { pesan: "Pilih BHP dulu.", sukses: false };
  if (!Number.isFinite(jumlah) || jumlah <= 0) return { pesan: "Jumlah harus lebih dari 0.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase
    .from("lab_resep_bhp")
    .upsert({ pemeriksaan_id: pemeriksaanId, bhp_id: bhpId, jumlah_default: jumlah }, { onConflict: "pemeriksaan_id,bhp_id" });
  if (error) return { pesan: `Gagal menyimpan: ${error.message}`, sukses: false };

  revalidatePath(`/dashboard/lab/katalog/${pemeriksaanId}/bhp`);
  revalidatePath("/dashboard/lab/katalog");
  return { pesan: "BHP ditambahkan ke pemeriksaan.", sukses: true };
}

export async function hapusResepBhpLabAction(resepId: string, pemeriksaanId: string): Promise<void> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) return;
  const supabase = createClient();
  await supabase.from("lab_resep_bhp").delete().eq("id", resepId);
  revalidatePath(`/dashboard/lab/katalog/${pemeriksaanId}/bhp`);
  revalidatePath("/dashboard/lab/katalog");
}

// FITUR 3 -- tautkan / lepas tarif kasir pada pemeriksaan katalog.
export async function ubahTarifPemeriksaanAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh ubah tarif pemeriksaan.", sukses: false };
  }
  const id = String(formData.get("id") ?? "");
  const tarifId = String(formData.get("tarif_layanan_id") ?? "").trim();
  if (!id) return { pesan: "Pemeriksaan gak ditemukan.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase
    .from("lab_pemeriksaan")
    .update({ tarif_layanan_id: tarifId || null })
    .eq("id", id);
  if (error) return { pesan: `Gagal simpan tarif: ${error.message}`, sukses: false };

  segarkan();
  return { pesan: tarifId ? "Tarif tersimpan." : "Tarif dilepas, pemeriksaan ini tidak ditagih.", sukses: true };
}

export async function ubahAktifPemeriksaanAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh ubah katalog.", sukses: false };
  }
  const id = String(formData.get("id") ?? "");
  const aktif = String(formData.get("aktif") ?? "") === "1";
  if (!id) return { pesan: "Pemeriksaan gak ditemukan.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("lab_pemeriksaan").update({ aktif }).eq("id", id);
  if (error) return { pesan: `Gagal ubah status: ${error.message}`, sukses: false };

  segarkan();
  return { pesan: "", sukses: true };
}

// ---------------------------------------------------------------------------
// FITUR 1b -- Permintaan dari klaster
// ---------------------------------------------------------------------------

export async function buatPermintaanLabAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_MINTA_LAB.includes(pemanggil.peran)) {
    return { pesan: "Akunmu gak boleh minta pemeriksaan lab.", sukses: false };
  }

  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const prioritas = String(formData.get("prioritas") ?? "rutin") === "cito" ? "cito" : "rutin";
  const diagnosisKerja = String(formData.get("diagnosis_kerja") ?? "").trim();
  const catatanKlinis = String(formData.get("catatan_klinis") ?? "").trim();

  let pemeriksaanIds: string[] = [];
  try {
    pemeriksaanIds = JSON.parse(String(formData.get("pemeriksaan_ids") ?? "[]"));
  } catch {
    return { pesan: "Pilihan pemeriksaan gak kebaca, coba lagi.", sukses: false };
  }
  pemeriksaanIds = [...new Set(pemeriksaanIds.filter(Boolean))];

  if (!kunjunganId) return { pesan: "Kunjungan gak ditemukan.", sukses: false };
  if (pemeriksaanIds.length === 0) return { pesan: "Pilih minimal satu pemeriksaan.", sukses: false };

  const supabase = createClient();

  // Pastikan semua pemeriksaan yang dipilih masih aktif di katalog.
  const { data: valid } = await supabase
    .from("lab_pemeriksaan")
    .select("id")
    .in("id", pemeriksaanIds)
    .eq("aktif", true);
  if ((valid ?? []).length !== pemeriksaanIds.length) {
    return { pesan: "Ada pemeriksaan yang sudah tidak aktif di katalog. Muat ulang halaman.", sukses: false };
  }

  const { data: permintaan, error } = await supabase
    .from("lab_permintaan")
    .insert({
      kunjungan_id: kunjunganId,
      prioritas,
      diagnosis_kerja: diagnosisKerja || null,
      catatan_klinis: catatanKlinis || null,
      diminta_oleh: pemanggil.id,
      diminta_oleh_nama: pemanggil.nama_lengkap,
    })
    .select("id, no_lab")
    .single();

  if (error || !permintaan) {
    return { pesan: `Gagal kirim permintaan: ${error?.message}`, sukses: false };
  }

  const { error: errorItem } = await supabase
    .from("lab_permintaan_item")
    .insert(pemeriksaanIds.map((pid) => ({ permintaan_id: permintaan.id, pemeriksaan_id: pid })));

  if (errorItem) {
    await supabase.from("lab_permintaan").delete().eq("id", permintaan.id);
    return { pesan: `Gagal simpan daftar pemeriksaan: ${errorItem.message}`, sukses: false };
  }

  segarkan();
  revalidatePath(`/dashboard/pelayanan/${kunjunganId}`);
  return { pesan: `Permintaan ${permintaan.no_lab} terkirim ke Laboratorium.`, sukses: true };
}

export async function batalkanPermintaanLabAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return { pesan: "Belum login.", sukses: false };

  const id = String(formData.get("id") ?? "");
  const alasan = String(formData.get("alasan") ?? "").trim();
  if (!id) return { pesan: "Permintaan gak ditemukan.", sukses: false };

  const supabase = createClient();
  const { data: p } = await supabase
    .from("lab_permintaan")
    .select("id, status, diminta_oleh, kunjungan_id")
    .eq("id", id)
    .maybeSingle();
  if (!p) return { pesan: "Permintaan gak ditemukan.", sukses: false };

  const lab = PERAN_LAB.includes(pemanggil.peran);
  const peminta = p.diminta_oleh === pemanggil.id;

  if (p.status === "selesai" || p.status === "dibatalkan") {
    return { pesan: "Permintaan ini sudah selesai/dibatalkan, gak bisa dibatalkan lagi.", sukses: false };
  }
  if (!lab && !(peminta && p.status === "diminta")) {
    return { pesan: "Cuma peminta (sebelum diterima Lab) atau Lab yang boleh membatalkan.", sukses: false };
  }

  const { error } = await supabase
    .from("lab_permintaan")
    .update({ status: "dibatalkan", alasan_batal: alasan || null })
    .eq("id", id);
  if (error) return { pesan: `Gagal membatalkan: ${error.message}`, sukses: false };

  segarkan();
  revalidatePath(`/dashboard/pelayanan/${p.kunjungan_id}`);
  return { pesan: "", sukses: true };
}

// ---------------------------------------------------------------------------
// FITUR 2a -- Lab: terima sampel
// ---------------------------------------------------------------------------

export async function terimaSampelAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh menerima sampel.", sukses: false };
  }
  const id = String(formData.get("id") ?? "");
  if (!id) return { pesan: "Permintaan gak ditemukan.", sukses: false };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("lab_permintaan")
    .update({
      status: "sampel_diterima",
      sampel_diterima_oleh: pemanggil.id,
      sampel_diterima_pada: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "diminta")
    .select("id")
    .maybeSingle();

  if (error) return { pesan: `Gagal terima sampel: ${error.message}`, sukses: false };
  if (!data) return { pesan: "Permintaan sudah diproses petugas lain atau dibatalkan.", sukses: false };

  segarkan();
  return { pesan: "", sukses: true };
}

// ---------------------------------------------------------------------------
// FITUR 2b -- Lab: simpan draft / validasi hasil
// ---------------------------------------------------------------------------

type BarisHasilMentah = { item_id: string; parameter_id: string; nilai: string; catatan: string };

type ItemDb = {
  id: string;
  dibatalkan: boolean;
  pemeriksaan: { id: string; nama: string; parameter: ParameterLab[] } | null;
};

export async function simpanHasilLabAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh input hasil.", sukses: false };
  }

  const permintaanId = String(formData.get("permintaan_id") ?? "");
  const mode = String(formData.get("mode") ?? "draft") === "validasi" ? "validasi" : "draft";
  const catatanValidasi = String(formData.get("catatan_validasi") ?? "").trim();

  let kiriman: BarisHasilMentah[] = [];
  try {
    kiriman = JSON.parse(String(formData.get("hasil") ?? "[]"));
  } catch {
    return { pesan: "Data hasil gak kebaca, coba lagi.", sukses: false };
  }

  const supabase = createClient();

  const { data: p } = await supabase
    .from("lab_permintaan")
    .select("id, status, kunjungan_id, kunjungan:kunjungan_id (pasien:pasien_id (jenis_kelamin))")
    .eq("id", permintaanId)
    .maybeSingle();
  if (!p) return { pesan: "Permintaan gak ditemukan.", sukses: false };

  if (!["sampel_diterima", "proses"].includes(p.status)) {
    return {
      pesan:
        p.status === "diminta"
          ? "Terima sampel dulu sebelum input hasil."
          : p.status === "selesai"
            ? "Hasil sudah divalidasi dan terkirim ke klaster, gak bisa diubah lagi."
            : "Permintaan ini sudah dibatalkan.",
      sukses: false,
    };
  }

  const kunj = p.kunjungan as unknown as { pasien: { jenis_kelamin: string | null } | null } | null;
  const jenisKelamin = kunj?.pasien?.jenis_kelamin ?? null;

  const { data: itemMentah, error: errItem } = await supabase
    .from("lab_permintaan_item")
    .select(
      "id, dibatalkan, pemeriksaan:pemeriksaan_id (id, nama, parameter:lab_parameter (id, nama, satuan, tipe, pilihan, pilihan_normal, min_l, max_l, min_p, max_p, kritis_min, kritis_max, urutan, aktif))"
    )
    .eq("permintaan_id", permintaanId);
  if (errItem) return { pesan: `Gagal baca daftar pemeriksaan: ${errItem.message}`, sukses: false };

  const item = ((itemMentah ?? []) as unknown as ItemDb[]).filter((i) => !i.dibatalkan && i.pemeriksaan);

  // Peta parameter yang sah per item, supaya kiriman klien gak bisa nyasar
  // ke item/parameter milik permintaan lain.
  const sah = new Map<string, ParameterLab>();
  for (const i of item) {
    for (const par of i.pemeriksaan!.parameter) sah.set(`${i.id}:${par.id}`, par);
  }

  const baris = [];
  for (const k of kiriman) {
    const nilai = String(k.nilai ?? "").trim();
    if (!nilai) continue;
    const par = sah.get(`${k.item_id}:${k.parameter_id}`);
    if (!par) continue;

    if (par.tipe === "angka" && Number.isNaN(Number(nilai.replace(",", ".")))) {
      return { pesan: `Nilai "${par.nama}" harus berupa angka.`, sukses: false };
    }
    if (par.tipe === "pilihan" && !(par.pilihan ?? []).includes(nilai)) {
      return { pesan: `Pilihan "${nilai}" gak valid untuk ${par.nama}.`, sukses: false };
    }

    baris.push({
      item_id: k.item_id,
      parameter_id: k.parameter_id,
      nama_parameter: par.nama,
      satuan: par.satuan,
      rujukan_teks: teksRujukan(par, jenisKelamin) || null,
      nilai,
      flag: hitungFlag(par, jenisKelamin, nilai),
      kritis: hitungKritis(par, nilai),
      catatan: String(k.catatan ?? "").trim() || null,
      dicatat_oleh: pemanggil.id,
      dicatat_pada: new Date().toISOString(),
    });
  }

  if (baris.length > 0) {
    const { error } = await supabase.from("lab_hasil").upsert(baris, { onConflict: "item_id,parameter_id" });
    if (error) return { pesan: `Gagal simpan hasil: ${error.message}`, sukses: false };
  }

  // Hitung kelengkapan dari data yang beneran tersimpan di database.
  const { data: tersimpan } = await supabase
    .from("lab_hasil")
    .select("item_id, parameter_id")
    .in("item_id", item.map((i) => i.id));
  const sudahIsi = new Set((tersimpan ?? []).map((t) => `${t.item_id}:${t.parameter_id}`));

  const kosong: string[] = [];
  for (const i of item) {
    for (const par of i.pemeriksaan!.parameter) {
      if (par.aktif && !sudahIsi.has(`${i.id}:${par.id}`)) kosong.push(`${i.pemeriksaan!.nama} · ${par.nama}`);
    }
  }

  if (mode === "draft") {
    if (p.status === "sampel_diterima" && baris.length > 0) {
      await supabase.from("lab_permintaan").update({ status: "proses" }).eq("id", permintaanId);
    }
    segarkan();
    return {
      pesan:
        kosong.length === 0
          ? "Draft tersimpan. Semua parameter sudah terisi, tinggal validasi."
          : `Draft tersimpan. ${kosong.length} parameter belum diisi.`,
      sukses: true,
    };
  }

  // Validasi: semua parameter aktif wajib terisi.
  if (kosong.length > 0) {
    if (p.status === "sampel_diterima" && baris.length > 0) {
      await supabase.from("lab_permintaan").update({ status: "proses" }).eq("id", permintaanId);
    }
    const contoh = kosong.slice(0, 3).join("; ");
    segarkan();
    return {
      pesan: `Belum bisa divalidasi, ${kosong.length} parameter masih kosong (mis. ${contoh}). Isian yang sudah ada tersimpan sebagai draft.`,
      sukses: false,
    };
  }

  const { data: selesai, error: errSelesai } = await supabase
    .from("lab_permintaan")
    .update({
      status: "selesai",
      divalidasi_oleh: pemanggil.id,
      divalidasi_oleh_nama: pemanggil.nama_lengkap,
      divalidasi_pada: new Date().toISOString(),
      catatan_validasi: catatanValidasi || null,
    })
    .eq("id", permintaanId)
    .in("status", ["sampel_diterima", "proses"])
    .select("id")
    .maybeSingle();

  if (errSelesai) return { pesan: `Hasil tersimpan tapi validasi gagal: ${errSelesai.message}`, sukses: false };
  if (!selesai) return { pesan: "Status permintaan berubah (mungkin dibatalkan). Muat ulang halaman.", sukses: false };

  // FITUR 3 -- tagihkan pemeriksaan bertarif ke kasir (idempotent di database).
  // FITUR 5 -- potong stok BHP/reagen sesuai resep pemeriksaan (idempotent).
  // Kegagalan salah satunya tidak membatalkan validasi; Lab diberi tahu
  // supaya bisa mengecek tarif/resep di katalog.
  const { data: jumlahTagih, error: errTagih } = await supabase.rpc("lab_tagihkan_permintaan", {
    p_permintaan_id: permintaanId,
  });
  const { data: potong, error: errPotong } = await supabase.rpc("lab_potong_bhp_permintaan", {
    p_permintaan_id: permintaanId,
  });
  segarkan();
  revalidatePath(`/dashboard/pelayanan/${p.kunjungan_id}`);
  revalidatePath("/dashboard/kasir");
  revalidatePath("/dashboard/lab/laporan");
  revalidatePath("/dashboard/farmasi/bhp");

  const catatan: string[] = [];
  if (errTagih) {
    catatan.push(`penagihan ke kasir gagal (${errTagih.message}; pastikan migrasi_tahap_44.sql sudah dijalankan)`);
  } else {
    const n = Number(jumlahTagih ?? 0);
    if (n > 0) catatan.push(`${n} pemeriksaan masuk tagihan kasir`);
  }
  if (errPotong) {
    catatan.push(`pemotongan stok BHP gagal (${errPotong.message}; pastikan migrasi_tahap_45.sql sudah dijalankan)`);
  } else {
    const hasilPotong = (potong ?? {}) as { pemakaian?: number; kurang?: string[] };
    if ((hasilPotong.pemakaian ?? 0) > 0) catatan.push(`stok BHP terpotong (${hasilPotong.pemakaian} pemakaian)`);
    if ((hasilPotong.kurang ?? []).length > 0) {
      catatan.push(`stok kurang/minus: ${(hasilPotong.kurang ?? []).join(", ")}`);
    }
  }

  return {
    pesan: `Hasil divalidasi dan terkirim ke klaster.${catatan.length ? ` ${catatan.join("; ")}.` : ""}`,
    sukses: true,
  };
}

// Peminta membuka hasil -> notifikasi hasil hilang. Lewat fungsi database
// khusus (lab_tandai_dilihat), bukan update langsung.
export async function tandaiHasilDilihatAction(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.rpc("lab_tandai_dilihat", { p_id: id });
  revalidatePath("/dashboard/lab/hasil");
}

// ---------------------------------------------------------------------------
// FITUR 7 -- Nilai kritis: batas per parameter + catatan lapor
// ---------------------------------------------------------------------------

export async function ubahBatasKritisAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh atur batas kritis.", sukses: false };
  }
  const id = String(formData.get("id") ?? "");
  const min = angkaAtauNull(String(formData.get("kritis_min") ?? ""));
  const max = angkaAtauNull(String(formData.get("kritis_max") ?? ""));
  if (!id) return { pesan: "Parameter gak ditemukan.", sukses: false };
  if (min != null && max != null && min >= max) {
    return { pesan: "Batas bawah harus lebih kecil dari batas atas.", sukses: false };
  }

  const supabase = createClient();
  const { error } = await supabase.from("lab_parameter").update({ kritis_min: min, kritis_max: max }).eq("id", id).eq("tipe", "angka");
  if (error) return { pesan: `Gagal simpan: ${error.message}`, sukses: false };

  segarkan();
  return { pesan: min == null && max == null ? "Batas kritis dihapus." : "Batas kritis tersimpan.", sukses: true };
}

export async function laporKritisAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh mencatat pelaporan nilai kritis.", sukses: false };
  }
  const id = String(formData.get("id") ?? "");
  const penerima = String(formData.get("penerima") ?? "").trim();
  const catatan = String(formData.get("catatan") ?? "").trim();
  if (!id) return { pesan: "Permintaan gak ditemukan.", sukses: false };
  if (!penerima) return { pesan: "Isi nama petugas yang dihubungi.", sukses: false };

  const supabase = createClient();
  const { data: adaKritis } = await supabase
    .from("lab_hasil")
    .select("id, item:item_id!inner (permintaan_id)")
    .eq("kritis", true)
    .eq("item.permintaan_id", id)
    .limit(1);
  if (!adaKritis || adaKritis.length === 0) {
    return { pesan: "Permintaan ini tidak punya hasil kritis.", sukses: false };
  }

  const { error } = await supabase
    .from("lab_permintaan")
    .update({
      kritis_dilaporkan_pada: new Date().toISOString(),
      kritis_dilaporkan_ke: penerima,
      kritis_dilaporkan_oleh: pemanggil.id,
      kritis_dilaporkan_oleh_nama: pemanggil.nama_lengkap,
      kritis_catatan: catatan || null,
    })
    .eq("id", id);
  if (error) return { pesan: `Gagal simpan: ${error.message}`, sukses: false };

  segarkan();
  revalidatePath(`/dashboard/lab/hasil/${id}`);
  revalidatePath("/dashboard/lab/laporan");
  return { pesan: "Pelaporan nilai kritis tercatat.", sukses: true };
}

// ---------------------------------------------------------------------------
// FITUR 8 -- Rujukan lab keluar
// ---------------------------------------------------------------------------

export async function rujukKeluarAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh merujuk pemeriksaan keluar.", sukses: false };
  }
  const itemId = String(formData.get("item_id") ?? "");
  const tujuan = String(formData.get("tujuan") ?? "").trim();
  const alasan = String(formData.get("alasan") ?? "").trim();
  if (!itemId) return { pesan: "Pilih pemeriksaan yang dirujuk.", sukses: false };
  if (!tujuan) return { pesan: "Isi tujuan rujukan (nama RS/lab).", sukses: false };

  const supabase = createClient();
  const { data: item } = await supabase
    .from("lab_permintaan_item")
    .select("id, dibatalkan, permintaan_id, pemeriksaan_id, pemeriksaan:pemeriksaan_id (nama), permintaan:permintaan_id (status, kunjungan_id)")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return { pesan: "Pemeriksaan gak ditemukan.", sukses: false };

  const perm = item.permintaan as unknown as { status: string; kunjungan_id: string } | null;
  const periksa = item.pemeriksaan as unknown as { nama: string } | null;
  if (!perm || !["sampel_diterima", "proses"].includes(perm.status)) {
    return { pesan: "Rujukan cuma bisa dibuat saat permintaan sedang diproses Lab.", sukses: false };
  }
  if (item.dibatalkan) return { pesan: "Pemeriksaan ini sudah dikeluarkan dari permintaan.", sukses: false };

  const { count: jumlahHasil } = await supabase
    .from("lab_hasil")
    .select("id", { count: "exact", head: true })
    .eq("item_id", itemId);
  if ((jumlahHasil ?? 0) > 0) {
    return { pesan: "Pemeriksaan ini sudah punya hasil di Lab, gak bisa dirujuk keluar.", sukses: false };
  }

  const { count: sisa } = await supabase
    .from("lab_permintaan_item")
    .select("id", { count: "exact", head: true })
    .eq("permintaan_id", item.permintaan_id)
    .eq("dibatalkan", false)
    .neq("id", itemId);
  if ((sisa ?? 0) === 0) {
    return {
      pesan:
        "Ini satu-satunya pemeriksaan aktif di permintaan. Kalau seluruh permintaan dirujuk, batalkan permintaan dan tulis tujuan rujukan di alasan batal.",
      sukses: false,
    };
  }

  const { data: rujukan, error } = await supabase
    .from("lab_rujukan_keluar")
    .insert({
      permintaan_id: item.permintaan_id,
      item_id: itemId,
      pemeriksaan_id: item.pemeriksaan_id,
      nama_pemeriksaan: periksa?.nama ?? "Pemeriksaan",
      tujuan,
      alasan: alasan || null,
      dikirim_oleh: pemanggil.id,
      dikirim_oleh_nama: pemanggil.nama_lengkap,
    })
    .select("id")
    .single();
  if (error || !rujukan) {
    return { pesan: `Gagal membuat rujukan: ${error?.message}. Pastikan migrasi_tahap_46.sql sudah dijalankan.`, sukses: false };
  }

  const { error: errItem } = await supabase.from("lab_permintaan_item").update({ dibatalkan: true }).eq("id", itemId);
  if (errItem) {
    await supabase.from("lab_rujukan_keluar").delete().eq("id", rujukan.id);
    return { pesan: `Gagal mengeluarkan pemeriksaan dari proses: ${errItem.message}`, sukses: false };
  }

  segarkan();
  revalidatePath(`/dashboard/lab/${item.permintaan_id}`);
  revalidatePath(`/dashboard/lab/hasil/${item.permintaan_id}`);
  revalidatePath("/dashboard/lab/rujukan");
  revalidatePath(`/dashboard/pelayanan/${perm.kunjungan_id}`);
  return { pesan: `${periksa?.nama ?? "Pemeriksaan"} dirujuk ke ${tujuan}.`, sukses: true };
}

export async function catatHasilRujukanAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh mencatat hasil rujukan.", sukses: false };
  }
  const id = String(formData.get("id") ?? "");
  const hasilTeks = String(formData.get("hasil_teks") ?? "").trim();
  if (!id) return { pesan: "Rujukan gak ditemukan.", sukses: false };
  if (!hasilTeks) return { pesan: "Isi hasil dari lab rujukan.", sukses: false };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("lab_rujukan_keluar")
    .update({
      status: "hasil_diterima",
      hasil_teks: hasilTeks,
      hasil_diterima_pada: new Date().toISOString(),
      hasil_dicatat_oleh_nama: pemanggil.nama_lengkap,
    })
    .eq("id", id)
    .eq("status", "dikirim")
    .select("id, permintaan_id")
    .maybeSingle();
  if (error) return { pesan: `Gagal simpan: ${error.message}`, sukses: false };
  if (!data) return { pesan: "Rujukan sudah diproses atau dibatalkan.", sukses: false };

  revalidatePath("/dashboard/lab/rujukan");
  revalidatePath(`/dashboard/lab/hasil/${data.permintaan_id}`);
  segarkan();
  return { pesan: "Hasil rujukan tercatat.", sukses: true };
}

export async function batalkanRujukanKeluarAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh membatalkan rujukan.", sukses: false };
  }
  const id = String(formData.get("id") ?? "");
  if (!id) return { pesan: "Rujukan gak ditemukan.", sukses: false };

  const supabase = createClient();
  const { data: r } = await supabase
    .from("lab_rujukan_keluar")
    .select("id, status, item_id, permintaan_id, permintaan:permintaan_id (status)")
    .eq("id", id)
    .maybeSingle();
  if (!r) return { pesan: "Rujukan gak ditemukan.", sukses: false };
  if (r.status !== "dikirim") return { pesan: "Cuma rujukan yang masih menunggu hasil yang bisa dibatalkan.", sukses: false };

  const { error } = await supabase.from("lab_rujukan_keluar").update({ status: "dibatalkan" }).eq("id", id).eq("status", "dikirim");
  if (error) return { pesan: `Gagal membatalkan: ${error.message}`, sukses: false };

  // Kembalikan pemeriksaan ke proses internal kalau permintaannya masih jalan.
  const statusPerm = (r.permintaan as unknown as { status: string } | null)?.status;
  if (r.item_id && statusPerm && ["sampel_diterima", "proses"].includes(statusPerm)) {
    await supabase.from("lab_permintaan_item").update({ dibatalkan: false }).eq("id", r.item_id);
  }

  revalidatePath("/dashboard/lab/rujukan");
  revalidatePath(`/dashboard/lab/${r.permintaan_id}`);
  revalidatePath(`/dashboard/lab/hasil/${r.permintaan_id}`);
  segarkan();
  return { pesan: "Rujukan dibatalkan.", sukses: true };
}

// ---------------------------------------------------------------------------
// FITUR 9 -- Penolakan sampel
// ---------------------------------------------------------------------------

export async function tolakSampelAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh menolak sampel.", sukses: false };
  }
  const id = String(formData.get("id") ?? "");
  const alasan = String(formData.get("alasan") ?? "").trim();
  const catatan = String(formData.get("catatan") ?? "").trim();
  if (!id) return { pesan: "Permintaan gak ditemukan.", sukses: false };
  if (!alasan) return { pesan: "Pilih alasan penolakan.", sukses: false };

  const supabase = createClient();
  const { data: p } = await supabase.from("lab_permintaan").select("kunjungan_id").eq("id", id).maybeSingle();

  const { data: dihapus, error } = await supabase.rpc("lab_tolak_sampel", {
    p_permintaan_id: id,
    p_alasan: alasan,
    p_catatan: catatan || null,
  });
  if (error) {
    return {
      pesan: `Gagal menolak sampel: ${error.message}${error.message.includes("lab_tolak_sampel") ? ". Pastikan migrasi_tahap_47.sql sudah dijalankan." : ""}`,
      sukses: false,
    };
  }

  segarkan();
  revalidatePath(`/dashboard/lab/hasil/${id}`);
  revalidatePath("/dashboard/lab/laporan");
  if (p?.kunjungan_id) revalidatePath(`/dashboard/pelayanan/${p.kunjungan_id}`);
  const n = Number(dihapus ?? 0);
  return {
    pesan: `Sampel ditolak. Permintaan kembali ke Menunggu Lab${n > 0 ? `, ${n} hasil draft dihapus` : ""}.`,
    sukses: true,
  };
}

// ---------------------------------------------------------------------------
// FITUR 10 -- Kontrol mutu (QC) harian
// ---------------------------------------------------------------------------

export async function tambahKontrolQcAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh menambah bahan kontrol.", sukses: false };
  }
  const nama = String(formData.get("nama") ?? "").trim();
  const parameterId = String(formData.get("parameter_id") ?? "").trim();
  const level = String(formData.get("level") ?? "").trim();
  const lot = String(formData.get("lot") ?? "").trim();
  const satuan = String(formData.get("satuan") ?? "").trim();
  const target = angkaAtauNull(String(formData.get("target") ?? ""));
  const sd = angkaAtauNull(String(formData.get("sd") ?? ""));

  if (!nama) return { pesan: "Nama bahan kontrol wajib diisi.", sukses: false };
  if (target == null) return { pesan: "Target (rata-rata) harus berupa angka.", sukses: false };
  if (sd == null || sd <= 0) return { pesan: "SD harus berupa angka lebih dari 0.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("lab_qc_kontrol").insert({
    nama,
    parameter_id: parameterId || null,
    level: level || null,
    lot: lot || null,
    satuan: satuan || null,
    target,
    sd,
  });
  if (error) {
    return { pesan: `Gagal simpan: ${error.message}${error.message.includes("lab_qc_kontrol") ? ". Pastikan migrasi_tahap_47.sql sudah dijalankan." : ""}`, sukses: false };
  }

  revalidatePath("/dashboard/lab/qc");
  return { pesan: `Bahan kontrol "${nama}" ditambahkan.`, sukses: true };
}

export async function catatQcAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh mencatat QC.", sukses: false };
  }
  const kontrolId = String(formData.get("kontrol_id") ?? "");
  const nilai = angkaAtauNull(String(formData.get("nilai") ?? ""));
  const catatan = String(formData.get("catatan") ?? "").trim();
  if (!kontrolId) return { pesan: "Bahan kontrol gak ditemukan.", sukses: false };
  if (nilai == null) return { pesan: "Nilai QC harus berupa angka.", sukses: false };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("lab_qc_hasil")
    .insert({
      kontrol_id: kontrolId,
      tanggal: hariIniWib(),
      nilai,
      catatan: catatan || null,
      dicatat_oleh: pemanggil.id,
      dicatat_oleh_nama: pemanggil.nama_lengkap,
    })
    .select("status, z")
    .single();
  if (error || !data) return { pesan: `Gagal simpan QC: ${error?.message}`, sukses: false };

  revalidatePath("/dashboard/lab/qc");
  revalidatePath("/dashboard/lab/laporan");
  const z = Number(data.z);
  const teksZ = `${z > 0 ? "+" : ""}${String(z).replace(".", ",")} SD`;
  if (data.status === "ditolak") {
    return { pesan: `QC DITOLAK (${teksZ}). Jangan validasi hasil pasien sebelum alat/reagen dicek dan QC diulang.`, sukses: false };
  }
  if (data.status === "peringatan") {
    return { pesan: `QC tercatat dengan peringatan (${teksZ}). Pantau dan pertimbangkan mengulang.`, sukses: true };
  }
  return { pesan: `QC tercatat, dalam kendali (${teksZ}).`, sukses: true };
}

export async function ubahAktifKontrolQcAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh ubah bahan kontrol.", sukses: false };
  }
  const id = String(formData.get("id") ?? "");
  const aktif = String(formData.get("aktif") ?? "") === "true";
  if (!id) return { pesan: "Bahan kontrol gak ditemukan.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("lab_qc_kontrol").update({ aktif }).eq("id", id);
  if (error) return { pesan: `Gagal ubah: ${error.message}`, sukses: false };

  revalidatePath("/dashboard/lab/qc");
  return { pesan: aktif ? "Bahan kontrol diaktifkan." : "Bahan kontrol dinonaktifkan.", sukses: true };
}

// ---------------------------------------------------------------------------
// FITUR 11 -- Alat lab, kalibrasi & pemeliharaan
// ---------------------------------------------------------------------------

const JENIS_LOG_ALAT_VALID = ["kalibrasi", "pemeliharaan", "perbaikan"];
const HASIL_LOG_ALAT_VALID = ["baik", "perlu_tindak_lanjut", "gagal"];
const KONDISI_ALAT_VALID = ["baik", "perlu_perbaikan", "rusak", "nonaktif"];

function hariBulatPositif(v: string): number | null | "salah" {
  const t = (v ?? "").trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isInteger(n) || n <= 0) return "salah";
  return n;
}

function tanggalOpsional(v: FormDataEntryValue | null): string | null | "salah" {
  const t = String(v ?? "").trim();
  if (!t) return null;
  return tanggalValid(t) ? t : "salah";
}

function segarkanAlat() {
  revalidatePath("/dashboard/lab/alat");
  revalidatePath("/dashboard/lab");
}

export async function tambahAlatAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh menambah alat.", sukses: false };
  }
  const nama = String(formData.get("nama") ?? "").trim();
  if (!nama) return { pesan: "Nama alat wajib diisi.", sukses: false };

  const intervalKal = hariBulatPositif(String(formData.get("interval_kalibrasi_hari") ?? ""));
  const intervalPem = hariBulatPositif(String(formData.get("interval_pemeliharaan_hari") ?? ""));
  if (intervalKal === "salah" || intervalPem === "salah") {
    return { pesan: "Interval harus berupa bilangan bulat lebih dari 0 (hari).", sukses: false };
  }
  const pengadaan = tanggalOpsional(formData.get("tanggal_pengadaan"));
  const kalTerakhir = tanggalOpsional(formData.get("kalibrasi_terakhir"));
  const pemTerakhir = tanggalOpsional(formData.get("pemeliharaan_terakhir"));
  if (pengadaan === "salah" || kalTerakhir === "salah" || pemTerakhir === "salah") {
    return { pesan: "Format tanggal tidak valid.", sukses: false };
  }
  const hariIni = hariIniWib();
  if ((kalTerakhir && kalTerakhir > hariIni) || (pemTerakhir && pemTerakhir > hariIni)) {
    return { pesan: "Tanggal kalibrasi/pemeliharaan terakhir tidak boleh di masa depan.", sukses: false };
  }

  const teks = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const supabase = createClient();
  const { error } = await supabase.from("lab_alat").insert({
    nama,
    merk: teks("merk"),
    tipe: teks("tipe"),
    no_seri: teks("no_seri"),
    lokasi: teks("lokasi"),
    tanggal_pengadaan: pengadaan,
    interval_kalibrasi_hari: intervalKal,
    interval_pemeliharaan_hari: intervalPem,
    kalibrasi_terakhir: kalTerakhir,
    pemeliharaan_terakhir: pemTerakhir,
    catatan: teks("catatan"),
  });
  if (error) {
    return {
      pesan: `Gagal simpan: ${error.message}${error.message.includes("lab_alat") ? ". Pastikan migrasi_tahap_48.sql sudah dijalankan." : ""}`,
      sukses: false,
    };
  }
  segarkanAlat();
  return { pesan: `Alat "${nama}" ditambahkan.`, sukses: true };
}

export async function ubahKondisiAlatAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh mengubah kondisi alat.", sukses: false };
  }
  const id = String(formData.get("id") ?? "");
  const kondisi = String(formData.get("kondisi") ?? "");
  if (!id) return { pesan: "Alat gak ditemukan.", sukses: false };
  if (!KONDISI_ALAT_VALID.includes(kondisi)) return { pesan: "Kondisi tidak valid.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("lab_alat").update({ kondisi }).eq("id", id);
  if (error) return { pesan: `Gagal ubah: ${error.message}`, sukses: false };
  segarkanAlat();
  return { pesan: "Kondisi alat diperbarui.", sukses: true };
}

export async function catatLogAlatAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh mencatat kegiatan alat.", sukses: false };
  }
  const alatId = String(formData.get("alat_id") ?? "");
  const jenis = String(formData.get("jenis") ?? "");
  const hasil = String(formData.get("hasil") ?? "");
  const tanggal = String(formData.get("tanggal") ?? "").trim();
  if (!alatId) return { pesan: "Alat gak ditemukan.", sukses: false };
  if (!JENIS_LOG_ALAT_VALID.includes(jenis)) return { pesan: "Jenis kegiatan tidak valid.", sukses: false };
  if (!HASIL_LOG_ALAT_VALID.includes(hasil)) return { pesan: "Hasil kegiatan tidak valid.", sukses: false };
  if (!tanggalValid(tanggal)) return { pesan: "Tanggal kegiatan tidak valid.", sukses: false };
  if (tanggal > hariIniWib()) return { pesan: "Tanggal kegiatan tidak boleh di masa depan.", sukses: false };

  const teks = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const catatan = teks("catatan");
  if (hasil === "gagal" && !catatan) {
    return { pesan: "Kalau hasil gagal, isi catatan penyebab / tindakan yang diambil.", sukses: false };
  }

  const supabase = createClient();
  const { error } = await supabase.from("lab_alat_log").insert({
    alat_id: alatId,
    jenis,
    tanggal,
    hasil,
    pelaksana: teks("pelaksana"),
    no_sertifikat: teks("no_sertifikat"),
    catatan,
    dicatat_oleh: pemanggil.id,
    dicatat_oleh_nama: pemanggil.nama_lengkap,
  });
  if (error) return { pesan: `Gagal simpan: ${error.message}`, sukses: false };

  segarkanAlat();
  if (hasil === "gagal" && jenis !== "perbaikan") {
    return { pesan: "Tercatat GAGAL. Alat otomatis ditandai perlu perbaikan, jadwal tidak maju. Jangan dipakai untuk sampel pasien sebelum diperbaiki dan diulang.", sukses: false };
  }
  if (hasil === "gagal") return { pesan: "Perbaikan tercatat gagal, alat ditandai rusak.", sukses: false };
  return { pesan: "Kegiatan tercatat, jadwal berikutnya diperbarui otomatis.", sukses: true };
}

// ---------------------------------------------------------------------------
// FITUR 12 -- Lot reagen & kadaluarsa
// ---------------------------------------------------------------------------

function segarkanLot() {
  revalidatePath("/dashboard/lab/reagen");
  revalidatePath("/dashboard/lab");
}

export async function tambahLotAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh mencatat lot reagen.", sukses: false };
  }
  const bhpId = String(formData.get("bhp_id") ?? "");
  const noLot = String(formData.get("no_lot") ?? "").trim();
  const kadaluarsa = String(formData.get("tanggal_kadaluarsa") ?? "").trim();
  const terima = String(formData.get("tanggal_terima") ?? "").trim() || hariIniWib();
  if (!bhpId) return { pesan: "Pilih reagen/BHP dulu.", sukses: false };
  if (!noLot) return { pesan: "Nomor lot wajib diisi.", sukses: false };
  if (!tanggalValid(kadaluarsa)) return { pesan: "Tanggal kadaluarsa wajib diisi dengan benar.", sukses: false };
  if (!tanggalValid(terima)) return { pesan: "Tanggal terima tidak valid.", sukses: false };

  const jumlahTeks = String(formData.get("jumlah_diterima") ?? "").trim();
  const jumlah = jumlahTeks ? angkaAtauNull(jumlahTeks) : null;
  if (jumlahTeks && (jumlah == null || jumlah < 0)) {
    return { pesan: "Jumlah diterima harus berupa angka (0 atau lebih).", sukses: false };
  }
  const stabilitas = hariBulatPositif(String(formData.get("stabilitas_hari") ?? ""));
  if (stabilitas === "salah") {
    return { pesan: "Masa stabilitas harus bilangan bulat lebih dari 0 (hari).", sukses: false };
  }

  const supabase = createClient();
  const { error } = await supabase.from("lab_reagen_lot").insert({
    bhp_id: bhpId,
    no_lot: noLot,
    tanggal_kadaluarsa: kadaluarsa,
    tanggal_terima: terima,
    jumlah_diterima: jumlah,
    stabilitas_hari: stabilitas,
    catatan: String(formData.get("catatan") ?? "").trim() || null,
    dicatat_oleh: pemanggil.id,
    dicatat_oleh_nama: pemanggil.nama_lengkap,
  });
  if (error) {
    if (error.code === "23505") {
      return { pesan: `Lot ${noLot} untuk reagen ini sudah tercatat.`, sukses: false };
    }
    return {
      pesan: `Gagal simpan: ${error.message}${error.message.includes("lab_reagen_lot") ? ". Pastikan migrasi_tahap_48.sql sudah dijalankan." : ""}`,
      sukses: false,
    };
  }
  segarkanLot();
  const peringatan = kadaluarsa < hariIniWib() ? " Perhatian: lot ini SUDAH kadaluarsa, jangan dipakai." : "";
  return { pesan: `Lot ${noLot} tercatat.${peringatan}`, sukses: !peringatan };
}

export async function ubahStatusLotAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh mengubah status lot.", sukses: false };
  }
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const catatan = String(formData.get("catatan") ?? "").trim();
  if (!id) return { pesan: "Lot gak ditemukan.", sukses: false };
  if (!["dipakai", "habis", "dibuang"].includes(status)) return { pesan: "Status tidak valid.", sukses: false };
  if (status === "dibuang" && !catatan) {
    return { pesan: "Isi alasan pembuangan (mis. kadaluarsa, kontaminasi, rusak).", sukses: false };
  }

  const supabase = createClient();
  const { data: lot, error: errBaca } = await supabase
    .from("lab_reagen_lot")
    .select("status, tanggal_kadaluarsa, tanggal_dibuka, stabilitas_hari, catatan")
    .eq("id", id)
    .single();
  if (errBaca || !lot) return { pesan: "Lot gak ditemukan.", sukses: false };
  if (lot.status === "habis" || lot.status === "dibuang") {
    return { pesan: "Lot ini sudah ditutup (habis/dibuang), statusnya tidak bisa diubah lagi.", sukses: false };
  }

  const hariIni = hariIniWib();
  if (status === "dipakai") {
    if (lot.status === "dipakai") return { pesan: "Lot sudah berstatus dipakai.", sukses: false };
    if (lot.tanggal_kadaluarsa < hariIni) {
      return { pesan: "Lot sudah kadaluarsa, tidak boleh dipakai. Tandai dibuang.", sukses: false };
    }
  }

  const ubah: Record<string, string | null> = { status };
  if (status === "dipakai") ubah.tanggal_dibuka = lot.tanggal_dibuka ?? hariIni;
  if (catatan) {
    ubah.catatan = lot.catatan ? `${lot.catatan} | ${catatan}` : catatan;
  }
  const { error } = await supabase.from("lab_reagen_lot").update(ubah).eq("id", id);
  if (error) return { pesan: `Gagal ubah: ${error.message}`, sukses: false };

  segarkanLot();
  return {
    pesan: status === "dipakai" ? "Lot mulai dipakai, tanggal dibuka tercatat hari ini." : status === "habis" ? "Lot ditandai habis." : "Lot ditandai dibuang.",
    sukses: true,
  };
}

export async function hapusLotAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh menghapus lot.", sukses: false };
  }
  const id = String(formData.get("id") ?? "");
  if (!id) return { pesan: "Lot gak ditemukan.", sukses: false };

  const supabase = createClient();
  // RLS cuma mengizinkan hapus lot yang masih "tersimpan" (salah input).
  const { data, error } = await supabase.from("lab_reagen_lot").delete().eq("id", id).eq("status", "tersimpan").select("id");
  if (error) return { pesan: `Gagal hapus: ${error.message}`, sukses: false };
  if (!data || data.length === 0) {
    return { pesan: "Lot tidak bisa dihapus (sudah pernah dipakai). Tandai habis atau dibuang saja.", sukses: false };
  }
  segarkanLot();
  return { pesan: "Lot dihapus.", sukses: true };
}

// ---------------------------------------------------------------------------
// FITUR 13 -- Pemantapan Mutu Eksternal (PME)
// ---------------------------------------------------------------------------

function segarkanPme() {
  revalidatePath("/dashboard/lab/pme");
  revalidatePath("/dashboard/lab");
}

function teksAtauNull(formData: FormData, k: string): string | null {
  return String(formData.get(k) ?? "").trim() || null;
}

export async function tambahPmeAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh mencatat siklus PME.", sukses: false };
  }
  const penyelenggara = String(formData.get("penyelenggara") ?? "").trim();
  const siklus = String(formData.get("siklus") ?? "").trim();
  const namaParameter = String(formData.get("nama_parameter") ?? "").trim();
  const jenis = String(formData.get("jenis") ?? "kuantitatif");
  const terima = String(formData.get("tanggal_terima") ?? "").trim() || hariIniWib();
  const batas = tanggalOpsional(formData.get("batas_lapor"));
  if (!penyelenggara) return { pesan: "Penyelenggara PME wajib diisi.", sukses: false };
  if (!siklus) return { pesan: "Siklus wajib diisi (mis. Siklus 1 2026).", sukses: false };
  if (!namaParameter) return { pesan: "Parameter yang diuji wajib diisi.", sukses: false };
  if (!["kuantitatif", "kualitatif"].includes(jenis)) return { pesan: "Jenis tidak valid.", sukses: false };
  if (!tanggalValid(terima)) return { pesan: "Tanggal terima tidak valid.", sukses: false };
  if (batas === "salah") return { pesan: "Batas lapor tidak valid.", sukses: false };
  if (batas && batas < terima) return { pesan: "Batas lapor tidak boleh sebelum tanggal terima sampel.", sukses: false };

  const supabase = createClient();
  const { error } = await supabase.from("lab_pme").insert({
    penyelenggara,
    program: teksAtauNull(formData, "program"),
    siklus,
    nama_parameter: namaParameter,
    satuan: jenis === "kuantitatif" ? teksAtauNull(formData, "satuan") : null,
    jenis,
    tanggal_terima: terima,
    batas_lapor: batas,
    catatan: teksAtauNull(formData, "catatan"),
    dicatat_oleh: pemanggil.id,
    dicatat_oleh_nama: pemanggil.nama_lengkap,
  });
  if (error) {
    return {
      pesan: `Gagal simpan: ${error.message}${error.message.includes("lab_pme") ? ". Pastikan migrasi_tahap_49.sql sudah dijalankan." : ""}`,
      sukses: false,
    };
  }
  segarkanPme();
  return { pesan: `Siklus ${siklus} (${namaParameter}) dicatat.`, sukses: true };
}

export async function laporPmeAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh mencatat hasil PME.", sukses: false };
  }
  const id = String(formData.get("id") ?? "");
  if (!id) return { pesan: "Siklus PME gak ditemukan.", sukses: false };
  const tanggal = String(formData.get("tanggal_dilaporkan") ?? "").trim() || hariIniWib();
  if (!tanggalValid(tanggal)) return { pesan: "Tanggal lapor tidak valid.", sukses: false };
  if (tanggal > hariIniWib()) return { pesan: "Tanggal lapor tidak boleh di masa depan.", sukses: false };

  const supabase = createClient();
  const { data: pme, error: errBaca } = await supabase.from("lab_pme").select("jenis, status, tanggal_terima").eq("id", id).single();
  if (errBaca || !pme) return { pesan: "Siklus PME gak ditemukan.", sukses: false };
  if (pme.status === "dievaluasi") return { pesan: "Siklus ini sudah dievaluasi, hasil lab tidak bisa diubah.", sukses: false };
  if (tanggal < pme.tanggal_terima) return { pesan: "Tanggal lapor tidak boleh sebelum sampel diterima.", sukses: false };

  const ubah: Record<string, string | number | null> = { tanggal_dilaporkan: tanggal };
  if (pme.jenis === "kuantitatif") {
    const nilai = angkaAtauNull(String(formData.get("nilai_lab") ?? ""));
    if (nilai == null) return { pesan: "Nilai hasil lab harus berupa angka.", sukses: false };
    ubah.nilai_lab = nilai;
  } else {
    const hasil = String(formData.get("hasil_lab") ?? "").trim();
    if (!hasil) return { pesan: "Hasil lab wajib diisi (mis. Reaktif / Non-reaktif).", sukses: false };
    ubah.hasil_lab = hasil;
  }

  const { error } = await supabase.from("lab_pme").update(ubah).eq("id", id);
  if (error) return { pesan: `Gagal simpan: ${error.message}`, sukses: false };
  segarkanPme();
  return { pesan: "Hasil lab tercatat. Tunggu hasil evaluasi dari penyelenggara.", sukses: true };
}

export async function evaluasiPmeAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh mencatat evaluasi PME.", sukses: false };
  }
  const id = String(formData.get("id") ?? "");
  if (!id) return { pesan: "Siklus PME gak ditemukan.", sukses: false };

  const supabase = createClient();
  const { data: pme, error: errBaca } = await supabase
    .from("lab_pme")
    .select("jenis, status, nilai_lab, hasil_lab")
    .eq("id", id)
    .single();
  if (errBaca || !pme) return { pesan: "Siklus PME gak ditemukan.", sukses: false };
  if (pme.status === "diterima") return { pesan: "Catat hasil lab dulu sebelum memasukkan evaluasi penyelenggara.", sukses: false };

  const ubah: Record<string, string | number | null> = {
    tindak_lanjut: teksAtauNull(formData, "tindak_lanjut"),
  };
  const skorTeks = String(formData.get("skor") ?? "").trim();
  if (skorTeks) {
    const skor = angkaAtauNull(skorTeks);
    if (skor == null) return { pesan: "Skor harus berupa angka.", sukses: false };
    ubah.skor = skor;
  } else {
    ubah.skor = null;
  }

  let tidakMemuaskan = false;
  let perluTindak = false;
  if (pme.jenis === "kuantitatif") {
    const target = angkaAtauNull(String(formData.get("nilai_target") ?? ""));
    const sd = angkaAtauNull(String(formData.get("sd_peserta") ?? ""));
    if (target == null) return { pesan: "Nilai target harus berupa angka.", sukses: false };
    if (sd == null || sd <= 0) return { pesan: "SD peserta harus berupa angka lebih dari 0.", sukses: false };
    ubah.nilai_target = target;
    ubah.sd_peserta = sd;
    const sdi = Math.abs((Number(pme.nilai_lab) - target) / sd);
    tidakMemuaskan = sdi > 3;
    perluTindak = sdi > 2;
  } else {
    const benar = String(formData.get("hasil_benar") ?? "").trim();
    if (!benar) return { pesan: "Hasil yang benar (kunci jawaban) wajib diisi.", sukses: false };
    ubah.hasil_benar = benar;
    tidakMemuaskan = (pme.hasil_lab ?? "").trim().toLowerCase() !== benar.toLowerCase();
    perluTindak = tidakMemuaskan;
  }
  if (perluTindak && !ubah.tindak_lanjut) {
    return {
      pesan: tidakMemuaskan
        ? "Hasil tidak memuaskan. Isi tindak lanjut (investigasi penyebab dan tindakan perbaikan)."
        : "Hasil peringatan (SDI 2-3). Isi tindak lanjut / catatan pemantauan.",
      sukses: false,
    };
  }

  const { error } = await supabase.from("lab_pme").update(ubah).eq("id", id);
  if (error) return { pesan: `Gagal simpan: ${error.message}`, sukses: false };
  segarkanPme();
  return tidakMemuaskan
    ? { pesan: "Evaluasi tercatat: TIDAK MEMUASKAN. Pertimbangkan membuat laporan ketidaksesuaian.", sukses: false }
    : { pesan: "Evaluasi tercatat.", sukses: true };
}

export async function hapusPmeAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh menghapus siklus PME.", sukses: false };
  }
  const id = String(formData.get("id") ?? "");
  if (!id) return { pesan: "Siklus PME gak ditemukan.", sukses: false };
  const supabase = createClient();
  // RLS cuma mengizinkan hapus siklus yang belum dilaporkan (salah input).
  const { data, error } = await supabase.from("lab_pme").delete().eq("id", id).eq("status", "diterima").select("id");
  if (error) return { pesan: `Gagal hapus: ${error.message}`, sukses: false };
  if (!data || data.length === 0) return { pesan: "Siklus yang sudah dilaporkan tidak bisa dihapus.", sukses: false };
  segarkanPme();
  return { pesan: "Siklus dihapus.", sukses: true };
}

// ---------------------------------------------------------------------------
// FITUR 14 -- Ketidaksesuaian & tindakan korektif (CAPA)
// ---------------------------------------------------------------------------

const KATEGORI_KS_VALID = ["pra_analitik", "analitik", "pasca_analitik", "alat", "reagen", "keselamatan", "lainnya"];
const SUMBER_KS_VALID = ["qc", "pme", "sampel_ditolak", "alat", "reagen", "keluhan", "temuan_internal", "lainnya"];
const DAMPAK_KS_VALID = ["rendah", "sedang", "tinggi"];

function segarkanKs() {
  revalidatePath("/dashboard/lab/ketidaksesuaian");
  revalidatePath("/dashboard/lab");
}

export async function tambahKsAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh membuat laporan ketidaksesuaian.", sukses: false };
  }
  const kategori = String(formData.get("kategori") ?? "");
  const sumber = String(formData.get("sumber") ?? "");
  const dampak = String(formData.get("dampak") ?? "sedang");
  const uraian = String(formData.get("uraian") ?? "").trim();
  const tanggal = String(formData.get("tanggal") ?? "").trim() || hariIniWib();
  if (!KATEGORI_KS_VALID.includes(kategori)) return { pesan: "Pilih kategori ketidaksesuaian.", sukses: false };
  if (sumber && !SUMBER_KS_VALID.includes(sumber)) return { pesan: "Sumber tidak valid.", sukses: false };
  if (!DAMPAK_KS_VALID.includes(dampak)) return { pesan: "Tingkat dampak tidak valid.", sukses: false };
  if (!uraian) return { pesan: "Uraian kejadian wajib diisi.", sukses: false };
  if (!tanggalValid(tanggal)) return { pesan: "Tanggal kejadian tidak valid.", sukses: false };
  if (tanggal > hariIniWib()) return { pesan: "Tanggal kejadian tidak boleh di masa depan.", sukses: false };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("lab_ketidaksesuaian")
    .insert({
      tanggal,
      kategori,
      sumber: sumber || null,
      uraian,
      dampak,
      tindakan_segera: teksAtauNull(formData, "tindakan_segera"),
      dilaporkan_oleh: pemanggil.id,
      dilaporkan_oleh_nama: pemanggil.nama_lengkap,
    })
    .select("no_ks")
    .single();
  if (error || !data) {
    return {
      pesan: `Gagal simpan: ${error?.message}${error?.message.includes("lab_ketidaksesuaian") ? ". Pastikan migrasi_tahap_49.sql sudah dijalankan." : ""}`,
      sukses: false,
    };
  }
  segarkanKs();
  return { pesan: `Laporan ${data.no_ks} dibuat.`, sukses: true };
}

export async function tindakLanjutKsAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh mengisi tindak lanjut.", sukses: false };
  }
  const id = String(formData.get("id") ?? "");
  if (!id) return { pesan: "Laporan gak ditemukan.", sukses: false };
  const penyebab = String(formData.get("penyebab") ?? "").trim();
  const tindakan = String(formData.get("tindakan_korektif") ?? "").trim();
  const tenggat = tanggalOpsional(formData.get("tenggat"));
  if (!penyebab) return { pesan: "Penyebab (akar masalah) wajib diisi.", sukses: false };
  if (!tindakan) return { pesan: "Tindakan korektif wajib diisi.", sukses: false };
  if (tenggat === "salah") return { pesan: "Tenggat tidak valid.", sukses: false };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("lab_ketidaksesuaian")
    .update({
      penyebab,
      tindakan_korektif: tindakan,
      penanggung_jawab: teksAtauNull(formData, "penanggung_jawab"),
      tenggat,
      status: "ditindaklanjuti",
    })
    .eq("id", id)
    .neq("status", "ditutup")
    .select("id");
  if (error) return { pesan: `Gagal simpan: ${error.message}`, sukses: false };
  if (!data || data.length === 0) return { pesan: "Laporan sudah ditutup, tidak bisa diubah.", sukses: false };
  segarkanKs();
  return { pesan: "Tindak lanjut tersimpan.", sukses: true };
}

export async function tutupKsAction(_sebelum: Hasil | null, formData: FormData): Promise<Hasil> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return { pesan: "Cuma Lab/admin yang boleh menutup laporan.", sukses: false };
  }
  const id = String(formData.get("id") ?? "");
  const verifikasi = String(formData.get("verifikasi") ?? "").trim();
  if (!id) return { pesan: "Laporan gak ditemukan.", sukses: false };
  if (!verifikasi) return { pesan: "Isi verifikasi: bukti bahwa tindakan efektif dan masalah tidak terulang.", sukses: false };

  const supabase = createClient();
  const { data: ks, error: errBaca } = await supabase
    .from("lab_ketidaksesuaian")
    .select("status, penyebab, tindakan_korektif")
    .eq("id", id)
    .single();
  if (errBaca || !ks) return { pesan: "Laporan gak ditemukan.", sukses: false };
  if (ks.status === "ditutup") return { pesan: "Laporan sudah ditutup.", sukses: false };
  if (!ks.penyebab || !ks.tindakan_korektif) {
    return { pesan: "Isi penyebab dan tindakan korektif dulu sebelum menutup.", sukses: false };
  }

  const { error } = await supabase
    .from("lab_ketidaksesuaian")
    .update({ verifikasi, status: "ditutup", ditutup_oleh_nama: pemanggil.nama_lengkap })
    .eq("id", id);
  if (error) return { pesan: `Gagal menutup: ${error.message}`, sukses: false };
  segarkanKs();
  return { pesan: "Laporan ditutup.", sukses: true };
}
