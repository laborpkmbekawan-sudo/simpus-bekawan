import Link from "next/link";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { ambilSemuaLokasi, normalisasiNoRm } from "@/lib/lokasi";
import { ringkasTtv } from "@/lib/ttv";
import FormRujukan from "./form-rujukan";
import AksiRujukan from "./aksi-rujukan";
import type { PasienTerdaftar } from "./pilih-pasien";

const PERAN_KLINIS = ["admin", "dokter", "dokter_gigi", "perawat", "bidan"];

const WARNA_STATUS: Record<string, string> = {
  dibuat: "bg-clay-600/10 text-clay-700",
  diterima: "bg-teal-700/10 text-teal-700",
  selesai: "bg-ink/5 text-ink/50",
  dibatalkan: "bg-red-500/10 text-red-600",
};

export default async function HalamanRujukan({
  searchParams,
}: {
  searchParams: { tab?: string; rm?: string; kunjungan?: string };
}) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return null;

  const supabase = createClient();
  const admin = pemanggil.peran === "admin";
  const bolehLihatSemua = admin || pemanggil.peran === "kapus";
  const klinis = PERAN_KLINIS.includes(pemanggil.peran);

  const tab =
    searchParams.tab === "dibuat" ? "dibuat" : searchParams.tab === "semua" && bolehLihatSemua ? "semua" : "masuk";

  const semuaLokasi = await ambilSemuaLokasi();
  const lokasiSaya = semuaLokasi.find((l) => l.id === pemanggil.lokasi_id) ?? null;
  const kosong = "00000000-0000-0000-0000-000000000000";

  // Pemilih pasien (rujukan dari Induk): pasien yang didaftarkan petugas
  // pendaftaran hari ini, dibatasi ke klaster yang boleh diakses (admin: semua).
  let terdaftarHariIni: PasienTerdaftar[] = [];
  let pasienAwal: { noRm: string; nama: string; kunjunganId: string | null } | null = null;

  if (klinis && (admin || lokasiSaya?.tipe !== "pustu")) {
    const hariIni = new Date().toISOString().slice(0, 10);
    const [{ data: kunjunganMentah }, { data: aksesSaya }] = await Promise.all([
      supabase
        .from("kunjungan")
        .select(
          "id, nomor_antrian, status, klaster_tujuan_id, pasien:pasien_id (no_rm, nama_lengkap), klaster:klaster_tujuan_id (nama, kode_antrian)"
        )
        .eq("tanggal", hariIni)
        .order("nomor_antrian", { ascending: true }),
      admin
        ? Promise.resolve({ data: [] as { klaster_id: string }[] })
        : supabase.from("akses_klaster").select("klaster_id").eq("pegawai_id", pemanggil.id),
    ]);

    const klasterBoleh = new Set((aksesSaya ?? []).map((a) => a.klaster_id));
    const urutStatus: Record<string, number> = { dipanggil: 0, menunggu: 1, selesai: 2 };

    terdaftarHariIni = (kunjunganMentah ?? [])
      .filter((k) => admin || klasterBoleh.has(k.klaster_tujuan_id))
      .map((k) => {
        const pasien = k.pasien as unknown as { no_rm: string; nama_lengkap: string } | null;
        const klaster = k.klaster as unknown as { nama: string; kode_antrian: string | null } | null;
        return {
          kunjunganId: k.id as string,
          noRm: pasien?.no_rm ?? "",
          nama: pasien?.nama_lengkap ?? "—",
          nomorTampil: klaster?.kode_antrian
            ? `${klaster.kode_antrian}-${String(k.nomor_antrian).padStart(2, "0")}`
            : String(k.nomor_antrian),
          namaKlaster: klaster?.nama ?? "—",
          status: k.status as string,
        };
      })
      .filter((p) => p.noRm)
      .sort((a, b) => (urutStatus[a.status] ?? 3) - (urutStatus[b.status] ?? 3));

    // Datang dari tombol "Rujuk" di halaman Pelayanan: pasien langsung terpilih.
    const rmAwal = normalisasiNoRm(searchParams.rm ?? "");
    if (rmAwal) {
      const cocok =
        terdaftarHariIni.find((p) => p.kunjunganId === searchParams.kunjungan && p.noRm === rmAwal) ??
        terdaftarHariIni.find((p) => p.noRm === rmAwal);
      if (cocok) {
        pasienAwal = { noRm: cocok.noRm, nama: cocok.nama, kunjunganId: cocok.kunjunganId };
      } else {
        const { data: pasien } = await supabase
          .from("pasien")
          .select("no_rm, nama_lengkap")
          .eq("no_rm", rmAwal)
          .maybeSingle();
        if (pasien) pasienAwal = { noRm: pasien.no_rm, nama: pasien.nama_lengkap, kunjunganId: null };
      }
    }
  }

  let query = supabase
    .from("rujukan")
    .select(
      "id, jenis, status, alasan, diagnosis, tujuan_eksternal, poli_tujuan, catatan_tindak_lanjut, dibuat_oleh, dibuat_pada, ke_lokasi_id, pasien_nama, pasien_no_rm_asal, keluhan_utama, td_sistolik, td_diastolik, nadi, frekuensi_napas, suhu, spo2, gcs, berat_badan, dari:dari_lokasi_id (nama), ke:ke_lokasi_id (nama)"
    )
    .order("dibuat_pada", { ascending: false })
    .limit(100);

  if (tab === "masuk") {
    query = query.eq("jenis", "internal");
    if (!admin) query = pemanggil.lokasi_id ? query.eq("ke_lokasi_id", pemanggil.lokasi_id) : query.eq("id", kosong);
  } else if (tab === "dibuat") {
    query = query.eq("dibuat_oleh", pemanggil.id);
  }

  const [{ data: daftar }, { data: riwayatTujuan }] = await Promise.all([
    query,
    supabase.from("rujukan").select("tujuan_eksternal").eq("jenis", "eksternal").limit(200),
  ]);

  // Saran nama RS: yang pernah diketik sebelumnya, urut paling sering dipakai.
  const hitung = new Map<string, number>();
  for (const r of riwayatTujuan ?? []) {
    const nama = r.tujuan_eksternal?.trim();
    if (nama) hitung.set(nama, (hitung.get(nama) ?? 0) + 1);
  }
  const saranTujuan = [...hitung.entries()].sort((a, b) => b[1] - a[1]).map(([nama]) => nama);

  const tabCls = (aktif: boolean) =>
    `rounded-sm px-3.5 py-2 text-sm font-medium ${aktif ? "bg-teal-700 text-white" : "text-ink/60 hover:bg-sand-50"}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Rujukan</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Rujukan dari Pustu ke Puskesmas Induk, atau dari Puskesmas ke rumah sakit rujukan.
        </p>
      </div>

      <section className="rounded-card border border-sand-100 bg-white p-5">
        <h2 className="mb-4 text-base font-bold text-ink">Buat Rujukan</h2>
        {klinis ? (
          <FormRujukan
            semuaLokasi={semuaLokasi}
            lokasiSaya={lokasiSaya}
            admin={admin}
            saranTujuan={saranTujuan}
            terdaftarHariIni={terdaftarHariIni}
            pasienAwal={pasienAwal}
          />
        ) : (
          <p className="rounded-sm bg-sand-50 px-4 py-4 text-sm text-ink/60">
            Cuma tenaga klinis (dokter, dokter gigi, perawat, bidan) yang bisa membuat rujukan. Kamu tetap bisa melihat daftar rujukan di bawah.
          </p>
        )}
      </section>

      <section className="rounded-card border border-sand-100 bg-white p-5">
        <div className="mb-4 flex flex-wrap gap-1 border-b border-sand-100 pb-3">
          <Link href="/dashboard/rujukan?tab=masuk" className={tabCls(tab === "masuk")}>
            Rujukan Masuk
          </Link>
          <Link href="/dashboard/rujukan?tab=dibuat" className={tabCls(tab === "dibuat")}>
            Dibuat Saya
          </Link>
          {bolehLihatSemua && (
            <Link href="/dashboard/rujukan?tab=semua" className={tabCls(tab === "semua")}>
              Semua
            </Link>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                <th className="px-3 py-2.5 font-medium">Waktu</th>
                <th className="px-3 py-2.5 font-medium">Pasien</th>
                <th className="px-3 py-2.5 font-medium">Dari → Tujuan</th>
                <th className="px-3 py-2.5 font-medium">Diagnosis & alasan</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(daftar ?? []).map((r) => {
                const dari = (r.dari as unknown as { nama: string } | null)?.nama ?? "—";
                const ke = (r.ke as unknown as { nama: string } | null)?.nama;
                const penerima = admin || (r.jenis === "internal" && !!r.ke_lokasi_id && r.ke_lokasi_id === pemanggil.lokasi_id);
                const pembuat = admin || r.dibuat_oleh === pemanggil.id;
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-sand-100/70 align-top last:border-0 ${
                      r.status === "dibuat" && r.jenis === "internal" && r.ke_lokasi_id === pemanggil.lokasi_id
                        ? "bg-clay-600/5"
                        : ""
                    }`}
                  >
                    <td className="whitespace-nowrap px-3 py-3 text-ink/70">
                      {new Date(r.dibuat_pada).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-ink">{r.pasien_nama}</p>
                      <p className="text-xs text-ink/50">RM asal {r.pasien_no_rm_asal ?? "—"}</p>
                    </td>
                    <td className="px-3 py-3 text-ink/70">
                      <p>{dari}</p>
                      <p>
                        <span className="text-ink/40">→</span>{" "}
                        {r.jenis === "internal" ? ke ?? "—" : r.tujuan_eksternal}
                        {r.poli_tujuan ? <span className="text-ink/50"> · {r.poli_tujuan}</span> : null}
                      </p>
                      <span className="mt-1 inline-block rounded-sm bg-ink/5 px-2 py-0.5 text-[10px] font-semibold uppercase text-ink/60">
                        {r.jenis === "internal" ? "Internal" : "Eksternal"}
                      </span>
                    </td>
                    <td className="max-w-xs px-3 py-3 text-ink/80">
                      {r.diagnosis && <p className="font-medium">{r.diagnosis}</p>}
                      <p>{r.alasan}</p>
                      {r.keluhan_utama && <p className="mt-1 text-xs text-ink/60">Keluhan: {r.keluhan_utama}</p>}
                      {ringkasTtv(r) && <p className="mt-0.5 text-xs text-ink/60">{ringkasTtv(r)}</p>}
                      {r.catatan_tindak_lanjut && (
                        <p className="mt-1 text-xs text-teal-700">Tindak lanjut: {r.catatan_tindak_lanjut}</p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-sm px-2 py-0.5 text-xs font-medium capitalize ${WARNA_STATUS[r.status]}`}>{r.status}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-2">
                        <AksiRujukan
                          id={r.id}
                          jenis={r.jenis}
                          status={r.status}
                          bolehTerima={penerima}
                          bolehSelesai={r.jenis === "internal" ? penerima : pembuat}
                          bolehBatal={pembuat}
                        />
                        <Link
                          href={`/dashboard/rujukan/${r.id}/cetak`}
                          target="_blank"
                          className="text-xs font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
                        >
                          Cetak surat
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(daftar ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-ink/45">
                    {tab === "masuk" ? "Belum ada rujukan masuk ke lokasimu." : "Belum ada rujukan."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
