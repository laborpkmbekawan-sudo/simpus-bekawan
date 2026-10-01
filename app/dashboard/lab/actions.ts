"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { PERAN_LAB, PERAN_MINTA_LAB, hitungFlag, teksRujukan, type ParameterLab } from "@/lib/lab";

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
      "id, dibatalkan, pemeriksaan:pemeriksaan_id (id, nama, parameter:lab_parameter (id, nama, satuan, tipe, pilihan, pilihan_normal, min_l, max_l, min_p, max_p, urutan, aktif))"
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
