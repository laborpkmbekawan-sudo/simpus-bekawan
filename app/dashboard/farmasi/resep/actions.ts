"use server";

import { revalidatePath } from "next/cache";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";

// Farmasi boleh entri manual (sementara, sebelum dokter bisa nulis resep
// langsung dari halaman Pelayanan) -- peran klinis juga diizinin di RLS
// buat jaga-jaga integrasi nanti, tapi form entri manual sekarang cuma
// dipasang di menu Farmasi.
const PERAN_BOLEH_CATAT = ["admin", "dokter", "dokter_gigi", "perawat", "bidan", "farmasi"];
const PERAN_FARMASI = ["admin", "farmasi"];

type BarisItemMentah = {
  obat_id: string;
  dosis: string;
  frekuensi_per_hari: string;
  waktu_pemberian: string;
  durasi_hari: string;
  jumlah: string;
  catatan: string;
};

type RacikanMentah = {
  nama_racikan: string;
  jumlah_bungkus: string;
  waktu_pemberian: string;
  durasi_hari: string;
  catatan: string;
  komposisi: { obat_id: string; jumlah_total: string }[];
};

export async function buatResepManualAction(
  _sebelum: { pesan: string; sukses: boolean } | null,
  formData: FormData
): Promise<{ pesan: string; sukses: boolean }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_BOLEH_CATAT.includes(pemanggil.peran)) {
    return { pesan: "Akunmu gak boleh bikin resep.", sukses: false };
  }

  const kunjunganId = String(formData.get("kunjungan_id") ?? "");
  const catatan = String(formData.get("catatan") ?? "").trim();
  const itemsMentah = String(formData.get("items") ?? "[]");
  const racikanMentah = String(formData.get("racikan") ?? "[]");

  if (!kunjunganId) {
    return { pesan: "Pilih kunjungan/pasien dulu.", sukses: false };
  }

  let baris: BarisItemMentah[] = [];
  let racikan: RacikanMentah[] = [];
  try {
    baris = JSON.parse(itemsMentah);
    racikan = JSON.parse(racikanMentah);
  } catch {
    return { pesan: "Data obat gak kebaca, coba lagi.", sukses: false };
  }

  const itemValid = baris.filter((b) => b.obat_id && Number(b.jumlah) > 0);
  const racikanValid = racikan
    .map((r) => ({ ...r, komposisi: r.komposisi.filter((k) => k.obat_id && Number(k.jumlah_total) > 0) }))
    .filter((r) => r.nama_racikan.trim() && Number(r.jumlah_bungkus) > 0 && r.komposisi.length > 0);

  if (itemValid.length === 0 && racikanValid.length === 0) {
    return { pesan: "Tambah minimal satu obat atau satu racikan yang valid.", sukses: false };
  }

  const supabase = createClient();

  const { data: resepBaru, error } = await supabase
    .from("resep_obat")
    .insert({
      kunjungan_id: kunjunganId,
      catatan: catatan || null,
      dibuat_oleh: pemanggil.id,
    })
    .select("id")
    .single();

  if (error || !resepBaru) {
    return { pesan: `Gagal simpan resep: ${error?.message}`, sukses: false };
  }

  if (itemValid.length > 0) {
    const barisInsert = itemValid.map((b) => ({
      resep_obat_id: resepBaru.id,
      obat_id: b.obat_id,
      dosis: b.dosis || null,
      frekuensi_per_hari: b.frekuensi_per_hari ? Math.round(Number(b.frekuensi_per_hari)) : null,
      waktu_pemberian: b.waktu_pemberian || null,
      durasi_hari: b.durasi_hari ? Math.round(Number(b.durasi_hari)) : null,
      jumlah: Number(b.jumlah),
      catatan: b.catatan || null,
    }));

    const { error: errorItem } = await supabase.from("resep_obat_item").insert(barisInsert);
    if (errorItem) {
      return { pesan: `Resep tersimpan tapi baris obat gagal: ${errorItem.message}`, sukses: false };
    }
  }

  for (const r of racikanValid) {
    const { data: racikanBaru, error: errorRacikan } = await supabase
      .from("resep_racikan")
      .insert({
        resep_obat_id: resepBaru.id,
        nama_racikan: r.nama_racikan.trim(),
        jumlah_bungkus: Math.round(Number(r.jumlah_bungkus)),
        waktu_pemberian: r.waktu_pemberian || null,
        durasi_hari: r.durasi_hari ? Math.round(Number(r.durasi_hari)) : null,
        catatan: r.catatan || null,
      })
      .select("id")
      .single();

    if (errorRacikan || !racikanBaru) {
      return { pesan: `Resep tersimpan tapi racikan "${r.nama_racikan}" gagal: ${errorRacikan?.message}`, sukses: false };
    }

    const komposisiInsert = r.komposisi.map((k) => ({
      resep_racikan_id: racikanBaru.id,
      obat_id: k.obat_id,
      jumlah_total: Number(k.jumlah_total),
    }));

    const { error: errorKomposisi } = await supabase.from("resep_racikan_komposisi").insert(komposisiInsert);
    if (errorKomposisi) {
      return { pesan: `Racikan "${r.nama_racikan}" tersimpan tapi komposisinya gagal: ${errorKomposisi.message}`, sukses: false };
    }
  }

  revalidatePath("/dashboard/farmasi/resep");
  revalidatePath("/dashboard/farmasi/resep/entri");
  return { pesan: "Resep berhasil disimpan, masuk ke antrian Verifikasi & Penyerahan.", sukses: true };
}

export async function verifikasiSerahResepAction(
  _sebelum: { pesan: string } | null,
  formData: FormData
): Promise<{ pesan: string }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_FARMASI.includes(pemanggil.peran)) {
    return { pesan: "Cuma farmasi/admin yang boleh verifikasi & serahkan resep." };
  }

  const resepId = String(formData.get("resep_id") ?? "");
  if (!resepId) {
    return { pesan: "Resep gak ditemukan." };
  }

  const supabase = createClient();

  const [{ data: items }, { data: racikanList }] = await Promise.all([
    supabase
      .from("resep_obat_item")
      .select("id, obat_id, jumlah, dibatalkan, obat:obat_id (nama_obat, stok_saat_ini)")
      .eq("resep_obat_id", resepId)
      .eq("dibatalkan", false),
    supabase
      .from("resep_racikan")
      .select("id, nama_racikan, komposisi:resep_racikan_komposisi (id, obat_id, jumlah_total, dibatalkan, obat:obat_id (nama_obat, stok_saat_ini))")
      .eq("resep_obat_id", resepId),
  ]);

  const daftarItem = (items ?? []) as unknown as {
    id: string;
    obat_id: string;
    jumlah: number;
    obat: { nama_obat: string; stok_saat_ini: number } | null;
  }[];

  const daftarRacikan = (racikanList ?? []) as unknown as {
    id: string;
    nama_racikan: string;
    komposisi: {
      id: string;
      obat_id: string;
      jumlah_total: number;
      dibatalkan: boolean;
      obat: { nama_obat: string; stok_saat_ini: number } | null;
    }[];
  }[];

  const komposisiAktif = daftarRacikan.flatMap((r) => r.komposisi.filter((k) => !k.dibatalkan));

  if (daftarItem.length === 0 && komposisiAktif.length === 0) {
    return { pesan: "Gak ada baris obat/racikan aktif di resep ini." };
  }

  // Gabungin kebutuhan per obat (obat yang sama bisa muncul di item biasa
  // DAN di racikan) baru dicek stoknya sekali, biar gak salah lolos gara2
  // dicek terpisah-pisah padahal totalnya kurang.
  const kebutuhan = new Map<string, { nama: string; stokSaatIni: number; totalButuh: number }>();
  for (const it of daftarItem) {
    const k = kebutuhan.get(it.obat_id) ?? {
      nama: it.obat?.nama_obat ?? "obat",
      stokSaatIni: Number(it.obat?.stok_saat_ini ?? 0),
      totalButuh: 0,
    };
    k.totalButuh += Number(it.jumlah);
    kebutuhan.set(it.obat_id, k);
  }
  for (const k of komposisiAktif) {
    const x = kebutuhan.get(k.obat_id) ?? {
      nama: k.obat?.nama_obat ?? "obat",
      stokSaatIni: Number(k.obat?.stok_saat_ini ?? 0),
      totalButuh: 0,
    };
    x.totalButuh += Number(k.jumlah_total);
    kebutuhan.set(k.obat_id, x);
  }

  const kurang = [...kebutuhan.values()].filter((k) => k.stokSaatIni < k.totalButuh);
  if (kurang.length > 0) {
    return { pesan: `Stok gak cukup buat: ${kurang.map((k) => k.nama).join(", ")}. Batalkan baris itu atau isi stok dulu.` };
  }

  for (const [obatId, k] of kebutuhan) {
    const stokBaru = k.stokSaatIni - k.totalButuh;
    const { error: errorUpdate } = await supabase.from("obat").update({ stok_saat_ini: stokBaru }).eq("id", obatId);
    if (errorUpdate) {
      return { pesan: `Gagal potong stok ${k.nama}: ${errorUpdate.message}` };
    }
    await supabase.from("mutasi_stok_obat").insert({
      obat_id: obatId,
      jenis: "keluar",
      jumlah: k.totalButuh,
      keterangan: `Penyerahan resep ${resepId}`,
      dibuat_oleh: pemanggil.id,
    });
  }

  const { error: errorResep } = await supabase
    .from("resep_obat")
    .update({ status: "selesai", diserahkan_oleh: pemanggil.id, diserahkan_pada: new Date().toISOString() })
    .eq("id", resepId);

  if (errorResep) {
    return { pesan: `Stok udah kepotong tapi status resep gagal diupdate: ${errorResep.message}` };
  }

  revalidatePath("/dashboard/farmasi/resep");
  revalidatePath("/dashboard/farmasi/obat");
  revalidatePath("/dashboard/farmasi/kartu-stok");
  return { pesan: "" };
}

export async function batalkanResepAction(
  _sebelum: { pesan: string } | null,
  formData: FormData
): Promise<{ pesan: string }> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_FARMASI.includes(pemanggil.peran)) {
    return { pesan: "Cuma farmasi/admin yang boleh batalin resep." };
  }

  const resepId = String(formData.get("resep_id") ?? "");
  if (!resepId) {
    return { pesan: "Resep gak ditemukan." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("resep_obat").update({ status: "dibatalkan" }).eq("id", resepId);
  if (error) {
    return { pesan: `Gagal batalin resep: ${error.message}` };
  }

  revalidatePath("/dashboard/farmasi/resep");
  return { pesan: "" };
}
