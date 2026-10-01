import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LAPORAN_PUSTU, WARNA_STATUS_LAPORAN_PUSTU, LABEL_FLAG, WARNA_FLAG, namaBulan } from "@/lib/lab";
import { hariIniWib, tanggalPanjang, waktuWib } from "@/lib/format";
import { ambilKonteksPustu } from "./akses";
import AksiVerifikasiPustu from "./aksi-verifikasi";

type Hasil = {
  id: string;
  nama_parameter: string;
  satuan: string | null;
  rujukan_teks: string | null;
  nilai: string;
  flag: string | null;
  urutan: number;
};

type Laporan = {
  id: string;
  no_laporan: string;
  lokasi_id: string;
  nama_pemeriksaan: string;
  no_rm_pustu: string | null;
  nama_pasien: string;
  jenis_kelamin: string | null;
  tanggal_lahir: string | null;
  tanggal_periksa: string;
  catatan: string | null;
  status: string;
  dicatat_oleh_nama: string | null;
  dibuat_pada: string;
  diverifikasi_oleh_nama: string | null;
  diverifikasi_pada: string | null;
  catatan_verifikasi: string | null;
  lokasi: { nama: string } | null;
  hasil: Hasil[];
};

type StokBaris = {
  id: string;
  lokasi_id: string;
  periode: string;
  nama_barang: string;
  jenis: string;
  satuan: string;
  stok_akhir: number;
  stok_minimum: number;
  tanggal_kadaluarsa: string | null;
  lokasi: { nama: string } | null;
};

const SELECT_LAPORAN = `
  id, no_laporan, lokasi_id, nama_pemeriksaan, no_rm_pustu, nama_pasien, jenis_kelamin, tanggal_lahir, tanggal_periksa, catatan,
  status, dicatat_oleh_nama, dibuat_pada, diverifikasi_oleh_nama, diverifikasi_pada, catatan_verifikasi,
  lokasi:lokasi_id (nama),
  hasil:lab_pustu_hasil (id, nama_parameter, satuan, rujukan_teks, nilai, flag, urutan)
`;

function Pil({ status }: { status: string }) {
  return (
    <span className={`rounded-sm px-2.5 py-1 text-xs font-semibold ${WARNA_STATUS_LAPORAN_PUSTU[status] ?? "bg-ink/5 text-ink/70"}`}>
      {STATUS_LAPORAN_PUSTU[status] ?? status}
    </span>
  );
}

function TabelHasil({ hasil }: { hasil: Hasil[] }) {
  const urut = [...hasil].sort((a, b) => a.urutan - b.urutan);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-ink/40">
            <th className="py-1.5 pr-4">Parameter</th>
            <th className="py-1.5 pr-4">Hasil</th>
            <th className="py-1.5 pr-4">Rujukan</th>
            <th className="py-1.5">Penanda</th>
          </tr>
        </thead>
        <tbody>
          {urut.map((h) => (
            <tr key={h.id} className="border-t border-sand-100">
              <td className="py-1.5 pr-4 font-medium text-ink">{h.nama_parameter}</td>
              <td className="py-1.5 pr-4">
                {h.nilai}
                {h.satuan ? ` ${h.satuan}` : ""}
              </td>
              <td className="py-1.5 pr-4 text-ink/50">{h.rujukan_teks ?? "—"}</td>
              <td className={`py-1.5 ${h.flag ? WARNA_FLAG[h.flag] : "text-ink/30"}`}>{h.flag ? LABEL_FLAG[h.flag] : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Angka({ label, nilai, sorot }: { label: string; nilai: number; sorot?: boolean }) {
  return (
    <div className={`rounded-card border p-5 ${sorot && nilai > 0 ? "border-clay-600/30 bg-clay-600/5" : "border-sand-100 bg-white"}`}>
      <p className="text-xs font-bold uppercase text-ink/40">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold ${sorot && nilai > 0 ? "text-clay-700" : "text-ink"}`}>{nilai}</p>
    </div>
  );
}

function Galat({ pesan }: { pesan: string }) {
  return <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">{pesan}</div>;
}

export default async function HalamanLabPustu() {
  const konteks = await ambilKonteksPustu();
  if (konteks.mode === "tolak") return <Galat pesan={konteks.pesan} />;

  const supabase = createClient();
  const hariIni = hariIniWib();
  const bulanIni = `${hariIni.slice(0, 7)}-01`;

  let query = supabase.from("lab_pustu_laporan").select(SELECT_LAPORAN).order("dibuat_pada", { ascending: false }).range(0, 299);
  if (konteks.mode === "pustu") query = query.eq("lokasi_id", konteks.lokasiId);
  const { data: mentah, error } = await query;
  if (error) {
    return (
      <Galat
        pesan={`Gagal memuat laporan Pustu: ${error.message}${error.message.includes("lab_pustu") ? " — jalankan migrasi_tahap_50.sql di Supabase dulu." : ""}`}
      />
    );
  }
  const semua = (mentah ?? []) as unknown as Laporan[];

  let stokQuery = supabase
    .from("lab_pustu_stok")
    .select("id, lokasi_id, periode, nama_barang, jenis, satuan, stok_akhir, stok_minimum, tanggal_kadaluarsa, lokasi:lokasi_id (nama)")
    .eq("periode", bulanIni)
    .order("nama_barang");
  if (konteks.mode === "pustu") stokQuery = stokQuery.eq("lokasi_id", konteks.lokasiId);
  const { data: stokMentah } = await stokQuery;
  const stok = (stokMentah ?? []) as unknown as StokBaris[];
  const stokPerhatian = stok.filter(
    (s) => Number(s.stok_akhir) <= Number(s.stok_minimum) || (s.tanggal_kadaluarsa && s.tanggal_kadaluarsa <= hariIni),
  );

  const bulanLaporan = semua.filter((l) => l.tanggal_periksa >= bulanIni);
  const menunggu = semua.filter((l) => l.status === "terkirim");
  const dikembalikan = semua.filter((l) => l.status === "dikembalikan");
  const terverifikasi = semua.filter((l) => l.status === "diverifikasi");

  // ------------------------------------------------------------------ PUSTU
  if (konteks.mode === "pustu") {
    return (
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-ink">Lab Pustu</h1>
            <p className="text-sm text-ink/55">
              {konteks.namaLokasi} · laporan hasil pemeriksaan &amp; stok ke Lab Induk
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/lab/pustu/input" className="rounded-sm bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900">
              + Input hasil
            </Link>
            <Link
              href="/dashboard/lab/pustu/stok"
              className="rounded-sm border border-sand-100 bg-white px-4 py-2 text-sm font-semibold text-ink/70 hover:bg-sand-50"
            >
              Stok BHP &amp; reagen
            </Link>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Angka label={`Laporan ${namaBulan(bulanIni)}`} nilai={bulanLaporan.length} />
          <Angka label="Menunggu verifikasi" nilai={menunggu.length} />
          <Angka label="Dikembalikan Lab" nilai={dikembalikan.length} sorot />
          <Angka label="Stok perlu perhatian" nilai={stokPerhatian.length} sorot />
        </div>

        {dikembalikan.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-clay-700">Dikembalikan Lab, perlu diperbaiki</h2>
            {dikembalikan.map((l) => (
              <div key={l.id} className="rounded-card border border-clay-600/30 bg-clay-600/5 p-4 text-sm">
                <p className="font-bold text-ink">
                  {l.nama_pasien} · {l.nama_pemeriksaan} <span className="font-medium text-ink/40">{l.no_laporan}</span>
                </p>
                <p className="mt-1 text-clay-700">Alasan: {l.catatan_verifikasi}</p>
                <p className="mt-1 text-xs text-ink/50">
                  Input ulang lewat menu Input hasil dengan data yang sudah diperbaiki.
                </p>
              </div>
            ))}
          </section>
        )}

        <section className="rounded-card border border-sand-100 bg-white p-5">
          <h2 className="mb-3 text-base font-bold text-ink">Riwayat laporan saya</h2>
          {semua.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink/45">Belum ada laporan. Mulai dari &quot;+ Input hasil&quot;.</p>
          ) : (
            <div className="space-y-2">
              {semua.map((l) => (
                <details key={l.id} className="rounded-sm border border-sand-100 px-4 py-3">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm">
                    <span>
                      <b className="text-ink">{l.nama_pasien}</b> · {l.nama_pemeriksaan}{" "}
                      <span className="text-xs text-ink/40">
                        {l.no_laporan} · {tanggalPanjang(l.tanggal_periksa)}
                      </span>
                    </span>
                    <Pil status={l.status} />
                  </summary>
                  <div className="mt-3 space-y-2">
                    <TabelHasil hasil={l.hasil} />
                    {l.diverifikasi_pada && (
                      <p className="text-xs text-ink/50">
                        {l.status === "diverifikasi" ? "Diverifikasi" : "Dikembalikan"} oleh {l.diverifikasi_oleh_nama} · {waktuWib(l.diverifikasi_pada)}
                        {l.catatan_verifikasi ? ` · ${l.catatan_verifikasi}` : ""}
                      </p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // -------------------------------------------------------------------- LAB
  const lokasiMap = new Map<string, { nama: string; total: number; menunggu: number }>();
  for (const l of semua.filter((x) => x.tanggal_periksa >= bulanIni)) {
    const k = l.lokasi?.nama ?? "Pustu";
    const cur = lokasiMap.get(k) ?? { nama: k, total: 0, menunggu: 0 };
    cur.total += 1;
    if (l.status === "terkirim") cur.menunggu += 1;
    lokasiMap.set(k, cur);
  }
  const rekap = Array.from(lokasiMap.values()).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Laporan Pustu Masuk</h1>
          <p className="text-sm text-ink/55">Hasil pemeriksaan &amp; stok dari Pustu wilayah Bekawan</p>
        </div>
        {konteks.kelola && (
          <Link
            href="/dashboard/lab/pustu/izin"
            className="rounded-sm border border-sand-100 bg-white px-4 py-2 text-sm font-semibold text-ink/70 hover:bg-sand-50"
          >
            Atur pemeriksaan tiap Pustu
          </Link>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Angka label="Menunggu verifikasi" nilai={menunggu.length} sorot />
        <Angka label={`Laporan ${namaBulan(bulanIni)}`} nilai={bulanLaporan.length} />
        <Angka label="Terverifikasi" nilai={terverifikasi.length} />
        <Angka label="Stok Pustu perlu perhatian" nilai={stokPerhatian.length} sorot />
      </div>

      {rekap.length > 0 && (
        <section className="rounded-card border border-sand-100 bg-white p-5">
          <h2 className="mb-3 text-base font-bold text-ink">Rekap per Pustu bulan ini</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {rekap.map((r) => (
              <div key={r.nama} className="rounded-sm border border-sand-100 px-4 py-3 text-sm">
                <p className="font-bold text-ink">{r.nama}</p>
                <p className="text-ink/60">
                  {r.total} laporan{r.menunggu > 0 ? ` · ${r.menunggu} menunggu` : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-bold text-ink">Menunggu verifikasi</h2>
        {menunggu.length === 0 ? (
          <p className="rounded-card border border-sand-100 bg-white py-8 text-center text-sm text-ink/45">Tidak ada laporan yang menunggu.</p>
        ) : (
          menunggu.map((l) => (
            <div key={l.id} className="rounded-card border border-sand-100 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-extrabold text-ink">
                    {l.nama_pasien} <span className="text-sm font-medium text-ink/40">{l.no_laporan}</span>
                  </p>
                  <p className="text-xs text-ink/50">
                    {l.lokasi?.nama} · RM Pustu {l.no_rm_pustu ?? "-"} · {l.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"} ·{" "}
                    {tanggalPanjang(l.tanggal_periksa)} · {l.dicatat_oleh_nama}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-teal-700">{l.nama_pemeriksaan}</p>
                </div>
                <Pil status={l.status} />
              </div>
              <div className="mt-3">
                <TabelHasil hasil={l.hasil} />
              </div>
              {l.catatan && <p className="mt-2 text-xs text-ink/50">Catatan Pustu: {l.catatan}</p>}
              {konteks.kelola && <AksiVerifikasiPustu laporanId={l.id} />}
            </div>
          ))
        )}
      </section>

      {stokPerhatian.length > 0 && (
        <section className="rounded-card border border-clay-600/30 bg-clay-600/5 p-5">
          <h2 className="mb-2 text-base font-bold text-clay-700">Stok Pustu perlu perhatian ({namaBulan(bulanIni)})</h2>
          <ul className="space-y-1 text-sm text-ink">
            {stokPerhatian.map((s) => (
              <li key={s.id}>
                <b>{s.lokasi?.nama}</b> · {s.nama_barang}: sisa {Number(s.stok_akhir)} {s.satuan}
                {Number(s.stok_akhir) <= Number(s.stok_minimum) ? ` (minimum ${Number(s.stok_minimum)})` : ""}
                {s.tanggal_kadaluarsa && s.tanggal_kadaluarsa <= hariIni ? " · SUDAH kadaluarsa" : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-card border border-sand-100 bg-white p-5">
        <h2 className="mb-3 text-base font-bold text-ink">Riwayat laporan</h2>
        {semua.filter((l) => l.status !== "terkirim").length === 0 ? (
          <p className="py-6 text-center text-sm text-ink/45">Belum ada riwayat.</p>
        ) : (
          <div className="space-y-2">
            {semua
              .filter((l) => l.status !== "terkirim")
              .map((l) => (
                <details key={l.id} className="rounded-sm border border-sand-100 px-4 py-3">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm">
                    <span>
                      <b className="text-ink">{l.nama_pasien}</b> · {l.nama_pemeriksaan}{" "}
                      <span className="text-xs text-ink/40">
                        {l.lokasi?.nama} · {l.no_laporan} · {tanggalPanjang(l.tanggal_periksa)}
                      </span>
                    </span>
                    <Pil status={l.status} />
                  </summary>
                  <div className="mt-3 space-y-2">
                    <TabelHasil hasil={l.hasil} />
                    {l.diverifikasi_pada && (
                      <p className="text-xs text-ink/50">
                        {l.diverifikasi_oleh_nama} · {waktuWib(l.diverifikasi_pada)}
                        {l.catatan_verifikasi ? ` · ${l.catatan_verifikasi}` : ""}
                      </p>
                    )}
                  </div>
                </details>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
