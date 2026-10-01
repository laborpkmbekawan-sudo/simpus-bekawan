import { createClient, getPegawaiSaya, getKodeAksesSaya, punyaAkses } from "@/lib/supabase/server";
import { PERAN_LAB, PERAN_PUSTU_LAB } from "@/lib/lab";

export type KonteksPustu =
  | { mode: "tolak"; pesan: string }
  | { mode: "pustu"; pegawaiId: string; nama: string; lokasiId: string; namaLokasi: string }
  | { mode: "lab"; pegawaiId: string; nama: string; kelola: boolean };

// Tentukan siapa yang membuka halaman Lab Pustu:
//  - "pustu": petugas klinis yang berlokasi di Pustu
//  - "lab"  : Lab/admin (kelola) atau Kepala Puskesmas (lihat saja)
export async function ambilKonteksPustu(): Promise<KonteksPustu> {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return { mode: "tolak", pesan: "Silakan login dulu." };

  if ([...PERAN_LAB, "kapus"].includes(pemanggil.peran)) {
    const kelola = PERAN_LAB.includes(pemanggil.peran);
    if (kelola) {
      const kodeAkses = await getKodeAksesSaya(pemanggil.id, pemanggil.peran);
      if (!punyaAkses(kodeAkses, "lintas_lab")) {
        return {
          mode: "tolak",
          pesan: 'Akunmu belum dikasih akses ke Laboratorium. Minta admin nambahin akses klaster "Lintas Klaster - Lab" di halaman Data Pegawai.',
        };
      }
    }
    return { mode: "lab", pegawaiId: pemanggil.id, nama: pemanggil.nama_lengkap, kelola };
  }

  if (PERAN_PUSTU_LAB.includes(pemanggil.peran) && pemanggil.lokasi_id) {
    const supabase = createClient();
    const { data: lokasi } = await supabase.from("lokasi").select("id, nama, tipe").eq("id", pemanggil.lokasi_id).single();
    if (lokasi?.tipe === "pustu") {
      return { mode: "pustu", pegawaiId: pemanggil.id, nama: pemanggil.nama_lengkap, lokasiId: lokasi.id, namaLokasi: lokasi.nama };
    }
  }

  return { mode: "tolak", pesan: "Halaman ini untuk petugas Pustu, Laboratorium, admin, dan Kepala Puskesmas." };
}
