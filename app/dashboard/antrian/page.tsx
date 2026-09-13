import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import KartuAntrian from "./kartu-antrian";

export default async function HalamanAntrian() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return null;

  const supabase = createClient();
  const hariIni = new Date().toISOString().slice(0, 10);

  const bolehLihatSemua = pemanggil.peran === "admin" || pemanggil.peran === "loket_rm_kasir";

  const [{ data: kunjunganHariIni }, { data: aksesSaya }] = await Promise.all([
    supabase
      .from("kunjungan")
      .select(
        "id, nomor_antrian, jenis_kunjungan, status, klaster_tujuan_id, pasien:pasien_id (no_rm, nama_lengkap), klaster:klaster_tujuan_id (id, nama, kode_antrian), skrining (prioritas_triase)"
      )
      .eq("tanggal", hariIni)
      .order("nomor_antrian", { ascending: true }),
    // Diambil buat SEMUA peran (termasuk loket) -- dipakai buat nentuin
    // klaster mana yang boleh dia PANGGIL, terpisah dari klaster mana yang
    // boleh dia LIHAT.
    supabase.from("akses_klaster").select("klaster_id").eq("pegawai_id", pemanggil.id),
  ]);

  const klasterBolehDilihat = new Set((aksesSaya ?? []).map((a) => a.klaster_id));
  const klasterBolehAksi = new Set((aksesSaya ?? []).map((a) => a.klaster_id));

  const daftarTampil = (kunjunganHariIni ?? []).filter(
    (k) => bolehLihatSemua || klasterBolehDilihat.has(k.klaster_tujuan_id)
  );

  // Kelompokkan per klaster tujuan.
  const perKlaster = new Map<string, { namaKlaster: string; daftar: typeof daftarTampil }>();
  for (const k of daftarTampil) {
    const namaKlaster = (k.klaster as unknown as { nama: string } | null)?.nama ?? "Klaster";
    const grup = perKlaster.get(k.klaster_tujuan_id) ?? { namaKlaster, daftar: [] };
    grup.daftar.push(k);
    perKlaster.set(k.klaster_tujuan_id, grup);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Antrian Hari Ini</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {perKlaster.size === 0 && (
        <div className="rounded-card border border-sand-100 bg-white p-8 text-center text-sm text-ink/45">
          Belum ada antrian hari ini{!bolehLihatSemua ? " untuk klaster yang kamu akses" : ""}.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[...perKlaster.entries()].map(([klasterId, grup]) => (
          <div key={klasterId} className="rounded-card border border-sand-100 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-ink">{grup.namaKlaster}</p>
              <span className="text-xs text-ink/45">{grup.daftar.length} pasien</span>
            </div>
            <div className="space-y-2">
              {grup.daftar.map((k) => {
                const pasien = k.pasien as unknown as { no_rm: string; nama_lengkap: string } | null;
                const klasterInfo = k.klaster as unknown as { kode_antrian: string | null } | null;
                const triase =
                  (k.skrining as unknown as { prioritas_triase: string }[] | null)?.[0]?.prioritas_triase ?? null;
                const nomorTampil = klasterInfo?.kode_antrian
                  ? `${klasterInfo.kode_antrian}-${String(k.nomor_antrian).padStart(2, "0")}`
                  : String(k.nomor_antrian);
                // Panggil/Selesaikan hanya boleh dilakukan pegawai yang
                // punya akses ke klaster ini (atau admin) -- bukan otomatis
                // semua orang yang KEBETULAN bisa lihat daftarnya (mis. loket).
                const bisaPanggil = pemanggil.peran === "admin" || klasterBolehAksi.has(k.klaster_tujuan_id);
                return (
                  <KartuAntrian
                    key={k.id}
                    id={k.id}
                    nomorTampil={nomorTampil}
                    namaPasien={pasien?.nama_lengkap ?? "—"}
                    noRm={pasien?.no_rm ?? "—"}
                    jenisKunjungan={k.jenis_kunjungan}
                    status={k.status}
                    triase={triase}
                    bisaPanggil={bisaPanggil}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
