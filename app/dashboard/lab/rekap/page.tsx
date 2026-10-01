import Link from "next/link";
import { createClient, getPegawaiSaya, getKodeAksesSaya, punyaAkses } from "@/lib/supabase/server";
import { PERAN_LAB, STATUS_LAB, WARNA_STATUS_LAB, kadaluarsaEfektif, namaBulan, statusKadaluarsa } from "@/lib/lab";
import { awalHariWib, geserHari, hariIniWib, waktuWib } from "@/lib/format";

type Permintaan = {
  id: string;
  no_lab: string;
  status: string;
  prioritas: string;
  diminta_pada: string;
  divalidasi_pada: string | null;
  kunjungan: { pasien: { nama_lengkap: string } | null } | null;
  items: { dibatalkan: boolean; pemeriksaan: { nama: string } | null }[];
};

type Lot = {
  id: string;
  no_lot: string;
  tanggal_kadaluarsa: string;
  stabilitas_hari: number | null;
  tanggal_dibuka: string | null;
  bhp: { nama_bhp: string } | null;
};

function tanggalWib(iso: string) {
  return new Date(new Date(iso).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function durasi(menit: number) {
  if (menit < 60) return `${Math.round(menit)} mnt`;
  const j = menit / 60;
  if (j < 24) return `${Math.round(j * 10) / 10} jam`;
  return `${Math.round((j / 24) * 10) / 10} hari`;
}

function Kartu({ label, nilai, catatan, sorot }: { label: string; nilai: string | number; catatan: string; sorot?: boolean }) {
  return (
    <div className={`rounded-card border p-5 ${sorot ? "border-clay-600/30 bg-clay-600/5" : "border-sand-100 bg-white"}`}>
      <p className={`text-xs font-bold uppercase ${sorot ? "text-clay-700" : "text-ink/40"}`}>{label}</p>
      <p className={`mt-1 text-3xl font-extrabold ${sorot ? "text-clay-700" : "text-ink"}`}>{nilai}</p>
      <p className={`mt-1 text-xs ${sorot ? "text-clay-700" : "text-ink/50"}`}>{catatan}</p>
    </div>
  );
}

export default async function HalamanRekapLab() {
  const pemanggil = await getPegawaiSaya();
  const boleh = pemanggil && [...PERAN_LAB, "kapus"].includes(pemanggil.peran);
  if (!pemanggil || !boleh) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus Laboratorium, admin, dan Kepala Puskesmas.
      </div>
    );
  }
  if (PERAN_LAB.includes(pemanggil.peran)) {
    const kodeAkses = await getKodeAksesSaya(pemanggil.id, pemanggil.peran);
    if (!punyaAkses(kodeAkses, "lintas_lab")) {
      return (
        <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
          Akunmu belum dikasih akses ke Laboratorium. Minta admin nambahin akses klaster &quot;Lintas Klaster - Lab&quot; di halaman
          Data Pegawai.
        </div>
      );
    }
  }

  const hariIni = hariIniWib();
  const awalBulan = `${hariIni.slice(0, 7)}-01`;
  const awalTren = geserHari(hariIni, -13);
  const dari = awalBulan < awalTren ? awalBulan : awalTren;

  const supabase = createClient();
  const [permintaanRes, lotRes, bhpRes, pustuRes] = await Promise.all([
    supabase
      .from("lab_permintaan")
      .select(
        "id, no_lab, status, prioritas, diminta_pada, divalidasi_pada, kunjungan:kunjungan_id (pasien:pasien_id (nama_lengkap)), items:lab_permintaan_item (dibatalkan, pemeriksaan:pemeriksaan_id (nama))",
      )
      .gte("diminta_pada", awalHariWib(dari))
      .order("diminta_pada", { ascending: false })
      .range(0, 4999),
    supabase
      .from("lab_reagen_lot")
      .select("id, no_lot, tanggal_kadaluarsa, stabilitas_hari, tanggal_dibuka, bhp:bhp_id (nama_bhp)")
      .in("status", ["tersimpan", "dipakai"]),
    supabase.from("bhp").select("id, nama_bhp, satuan, stok_saat_ini, stok_minimum").eq("aktif", true),
    supabase.from("lab_pustu_laporan").select("id, status, lokasi_id").gte("tanggal_periksa", awalBulan),
  ]);

  if (permintaanRes.error) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Gagal memuat rekap: {permintaanRes.error.message}
      </div>
    );
  }

  const semua = (permintaanRes.data ?? []) as unknown as Permintaan[];
  const bulanIni = semua.filter((p) => tanggalWib(p.diminta_pada) >= awalBulan);
  const bulanAktif = bulanIni.filter((p) => p.status !== "dibatalkan");

  // Jumlah pemeriksaan = item yang tidak dibatalkan pada permintaan yang tidak dibatalkan.
  const itemBulan = bulanAktif.flatMap((p) => p.items.filter((i) => !i.dibatalkan));
  const jumlahPemeriksaan = itemBulan.length;

  const perNama = new Map<string, number>();
  for (const i of itemBulan) {
    const n = i.pemeriksaan?.nama ?? "—";
    perNama.set(n, (perNama.get(n) ?? 0) + 1);
  }
  const top = Array.from(perNama.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maksTop = top[0]?.[1] ?? 1;

  // Tren 14 hari.
  const tren = Array.from({ length: 14 }, (_, i) => {
    const tgl = geserHari(awalTren, i);
    return { tgl, jumlah: semua.filter((p) => p.status !== "dibatalkan" && tanggalWib(p.diminta_pada) === tgl).length };
  });
  const maksTren = Math.max(1, ...tren.map((t) => t.jumlah));

  // Distribusi status bulan ini.
  const perStatus = new Map<string, number>();
  for (const p of bulanIni) perStatus.set(p.status, (perStatus.get(p.status) ?? 0) + 1);

  // Waktu tunggu rata-rata (diminta -> divalidasi) untuk yang selesai.
  const selesai = bulanIni.filter((p) => p.status === "selesai" && p.divalidasi_pada);
  const rataMenit =
    selesai.length > 0
      ? selesai.reduce((t, p) => t + (new Date(p.divalidasi_pada!).getTime() - new Date(p.diminta_pada).getTime()) / 60000, 0) /
        selesai.length
      : null;

  const antre = semua.filter((p) => ["diminta", "sampel_diterima", "proses"].includes(p.status));
  const cito = antre.filter((p) => p.prioritas === "cito");

  // Indikator darurat reagen: stok menipis + lot kadaluarsa/segera.
  const menipis = ((bhpRes.data ?? []) as { nama_bhp: string; satuan: string; stok_saat_ini: number; stok_minimum: number }[]).filter(
    (b) => Number(b.stok_minimum) > 0 && Number(b.stok_saat_ini) <= Number(b.stok_minimum),
  );
  const lotBermasalah = ((lotRes.data ?? []) as unknown as Lot[])
    .map((l) => {
      const ef = kadaluarsaEfektif(l);
      return { l, st: statusKadaluarsa(ef.tanggal, hariIni) };
    })
    .filter((d) => d.st.status !== "aman")
    .sort((a, b) => a.st.sisaHari - b.st.sisaHari);
  const jumlahDarurat = menipis.length + lotBermasalah.length;

  const pustuBulan = (pustuRes.data ?? []) as { id: string; status: string; lokasi_id: string }[];
  const pustuMenunggu = pustuBulan.filter((l) => l.status === "terkirim").length;
  const jumlahPustuAktif = new Set(pustuBulan.map((l) => l.lokasi_id)).size;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-ink">Dashboard Rekap Lab</h1>
        <p className="text-sm text-ink/55">Ringkasan {namaBulan(awalBulan)} · diperbarui saat halaman dibuka</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kartu label="Jumlah pemeriksaan" nilai={jumlahPemeriksaan} catatan={`${bulanAktif.length} permintaan bulan ini`} />
        <Kartu
          label="Antrean aktif"
          nilai={antre.length}
          catatan={cito.length > 0 ? `${cito.length} berstatus CITO` : "Belum selesai diproses"}
          sorot={cito.length > 0}
        />
        <Kartu
          label="Laporan Pustu masuk"
          nilai={pustuBulan.length}
          catatan={
            pustuBulan.length === 0
              ? "Belum ada bulan ini"
              : `Dari ${jumlahPustuAktif} Pustu${pustuMenunggu > 0 ? ` · ${pustuMenunggu} menunggu verifikasi` : ""}`
          }
        />
        <Kartu
          label="Indikator darurat reagen"
          nilai={jumlahDarurat}
          catatan={`${menipis.length} menipis · ${lotBermasalah.length} lot kadaluarsa/segera`}
          sorot={jumlahDarurat > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-sand-100 bg-white p-5">
          <h2 className="mb-1 text-base font-bold text-ink">Permintaan 14 hari terakhir</h2>
          <p className="mb-4 text-xs text-ink/50">Tidak termasuk yang dibatalkan</p>
          <div className="flex h-36 items-end gap-1.5" role="img" aria-label="Grafik permintaan lab per hari">
            {tren.map((t) => (
              <div key={t.tgl} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] font-semibold text-ink/60">{t.jumlah || ""}</span>
                <div
                  className="w-full rounded-t-sm bg-teal-700"
                  style={{ height: `${(t.jumlah / maksTren) * 100}%`, minHeight: t.jumlah > 0 ? 4 : 1, opacity: t.jumlah > 0 ? 1 : 0.2 }}
                />
                <span className="text-[10px] text-ink/40">{t.tgl.slice(8)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-card border border-sand-100 bg-white p-5">
          <h2 className="mb-1 text-base font-bold text-ink">Pemeriksaan terbanyak bulan ini</h2>
          <p className="mb-4 text-xs text-ink/50">
            {rataMenit != null ? `Rata-rata waktu hasil keluar: ${durasi(rataMenit)} (${selesai.length} selesai)` : "Belum ada hasil selesai bulan ini"}
          </p>
          {top.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink/45">Belum ada data.</p>
          ) : (
            <ul className="space-y-2.5">
              {top.map(([nama, n]) => (
                <li key={nama} className="text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-ink">{nama}</span>
                    <span className="font-bold text-ink">{n}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-sand-100">
                    <div className="h-2 rounded-full bg-teal-700" style={{ width: `${(n / maksTop) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-card border border-sand-100 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-ink">Status permintaan bulan ini</h2>
          <Link href="/dashboard/lab" className="text-sm font-semibold text-teal-700 hover:underline">
            Buka antrean →
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.keys(STATUS_LAB).map((k) => (
            <span key={k} className={`rounded-sm px-3 py-1.5 text-sm font-semibold ${WARNA_STATUS_LAB[k]}`}>
              {STATUS_LAB[k]}: {perStatus.get(k) ?? 0}
            </span>
          ))}
        </div>
      </section>

      {jumlahDarurat > 0 && (
        <section className="rounded-card border border-clay-600/30 bg-clay-600/5 p-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-clay-700">Reagen &amp; BHP perlu tindakan</h2>
            <Link href="/dashboard/lab/reagen" className="text-sm font-semibold text-clay-700 hover:underline">
              Lot reagen →
            </Link>
          </div>
          <ul className="space-y-1 text-sm text-ink">
            {lotBermasalah.map(({ l, st }) => (
              <li key={l.id}>
                <b>{l.bhp?.nama_bhp ?? "Reagen"}</b> lot {l.no_lot}:{" "}
                {st.status === "kadaluarsa" ? `sudah kadaluarsa ${Math.abs(st.sisaHari)} hari lalu` : `kadaluarsa ${st.sisaHari} hari lagi`}
              </li>
            ))}
            {menipis.map((b) => (
              <li key={b.nama_bhp}>
                <b>{b.nama_bhp}</b>: sisa {Number(b.stok_saat_ini)} {b.satuan} (minimum {Number(b.stok_minimum)})
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-card border border-sand-100 bg-white p-5">
        <h2 className="mb-3 text-base font-bold text-ink">Pemeriksaan terbaru</h2>
        {semua.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink/45">Belum ada permintaan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-ink/40">
                  <th className="py-1.5 pr-4">No. Lab</th>
                  <th className="py-1.5 pr-4">Nama</th>
                  <th className="py-1.5 pr-4">Pemeriksaan</th>
                  <th className="py-1.5 pr-4">Diminta</th>
                  <th className="py-1.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {semua.slice(0, 8).map((p) => (
                  <tr key={p.id} className="border-t border-sand-100">
                    <td className="py-1.5 pr-4 text-ink/60">{p.no_lab}</td>
                    <td className="py-1.5 pr-4 font-medium text-ink">{p.kunjungan?.pasien?.nama_lengkap ?? "—"}</td>
                    <td className="py-1.5 pr-4">
                      {p.items
                        .filter((i) => !i.dibatalkan)
                        .map((i) => i.pemeriksaan?.nama)
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </td>
                    <td className="py-1.5 pr-4 text-ink/60">{waktuWib(p.diminta_pada)}</td>
                    <td className="py-1.5">
                      <span className={`rounded-sm px-2.5 py-1 text-xs font-semibold ${WARNA_STATUS_LAB[p.status] ?? "bg-ink/5 text-ink/70"}`}>
                        {STATUS_LAB[p.status] ?? p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
