import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import TabPosbindu, { type BarisPosbindu, type BarisProlanis, type PosyanduOpsi } from "./tab-posbindu";

type PosbinduMentah = {
  id: string;
  tanggal: string;
  berat_badan: number | null;
  tinggi_badan: number | null;
  td_sistolik: number | null;
  td_diastolik: number | null;
  gula_darah_sewaktu: number | null;
  hasil_skrining: string;
  faktor_risiko: string | null;
  pasien: { no_rm: string; nama_lengkap: string } | null;
  posyandu: { nama: string } | null;
};

type ProlanisMentah = {
  id: string;
  tanggal_kontrol: string;
  jenis_penyakit: string;
  td_sistolik: number | null;
  td_diastolik: number | null;
  gula_darah_puasa: number | null;
  gula_darah_sewaktu: number | null;
  kepatuhan_obat: string;
  keluhan: string | null;
  pasien: { no_rm: string; nama_lengkap: string } | null;
};

export default async function PosbinduKlaster3() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return null;

  const supabase = createClient();
  const { data: klaster3 } = await supabase.from("klaster").select("id, nama").eq("kode", "klaster_3").maybeSingle();

  if (!klaster3) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Klaster dengan kode "klaster_3" belum ada di Master Data.
      </div>
    );
  }

  let bolehLihat = ["admin", "kapus"].includes(pemanggil.peran);
  if (!bolehLihat) {
    const { data: akses } = await supabase
      .from("akses_klaster")
      .select("id")
      .eq("pegawai_id", pemanggil.id)
      .eq("klaster_id", klaster3.id)
      .maybeSingle();
    bolehLihat = !!akses;
  }

  if (!bolehLihat) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin, kapus, atau pegawai dengan akses Klaster 3.
      </div>
    );
  }

  const [{ data: posyanduMentah }, { data: posbinduMentah }, { data: prolanisMentah }] = await Promise.all([
    supabase.from("posyandu").select("id, nama").order("nama", { ascending: true }),
    supabase
      .from("kegiatan_posbindu_ptm")
      .select(
        "id, tanggal, berat_badan, tinggi_badan, td_sistolik, td_diastolik, gula_darah_sewaktu, hasil_skrining, faktor_risiko, pasien:pasien_id (no_rm, nama_lengkap), posyandu:posyandu_id (nama)"
      )
      .eq("dibatalkan", false)
      .order("tanggal", { ascending: false })
      .limit(300),
    supabase
      .from("kontrol_prolanis")
      .select(
        "id, tanggal_kontrol, jenis_penyakit, td_sistolik, td_diastolik, gula_darah_puasa, gula_darah_sewaktu, kepatuhan_obat, keluhan, pasien:pasien_id (no_rm, nama_lengkap)"
      )
      .eq("dibatalkan", false)
      .order("tanggal_kontrol", { ascending: false })
      .limit(300),
  ]);

  const posyanduOpsi: PosyanduOpsi[] = (posyanduMentah ?? []).map((p) => ({ id: p.id, nama: p.nama }));

  const posbindu: BarisPosbindu[] = ((posbinduMentah ?? []) as unknown as PosbinduMentah[]).map((p) => ({
    id: p.id,
    tanggal: p.tanggal,
    noRm: p.pasien?.no_rm ?? "—",
    namaPasien: p.pasien?.nama_lengkap ?? "—",
    namaPosyandu: p.posyandu?.nama ?? null,
    beratBadan: p.berat_badan,
    tinggiBadan: p.tinggi_badan,
    tdSistolik: p.td_sistolik,
    tdDiastolik: p.td_diastolik,
    gulaDarahSewaktu: p.gula_darah_sewaktu,
    hasilSkrining: p.hasil_skrining,
    faktorRisiko: p.faktor_risiko,
  }));

  const prolanis: BarisProlanis[] = ((prolanisMentah ?? []) as unknown as ProlanisMentah[]).map((p) => ({
    id: p.id,
    tanggalKontrol: p.tanggal_kontrol,
    noRm: p.pasien?.no_rm ?? "—",
    namaPasien: p.pasien?.nama_lengkap ?? "—",
    jenisPenyakit: p.jenis_penyakit,
    tdSistolik: p.td_sistolik,
    tdDiastolik: p.td_diastolik,
    gulaDarahPuasa: p.gula_darah_puasa,
    gulaDarahSewaktu: p.gula_darah_sewaktu,
    kepatuhanObat: p.kepatuhan_obat,
    keluhan: p.keluhan,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Posbindu PTM & Prolanis — {klaster3.nama}</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Kegiatan Posbindu PTM &amp; kontrol rutin Prolanis, gak selalu lewat antrean kunjungan.
        </p>
      </div>

      <TabPosbindu posyanduOpsi={posyanduOpsi} posbindu={posbindu} prolanis={prolanis} />
    </div>
  );
}
