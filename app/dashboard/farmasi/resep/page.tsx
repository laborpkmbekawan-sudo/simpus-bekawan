import Link from "next/link";
import { createClient, getPegawaiSaya, getKodeAksesSaya, punyaAkses } from "@/lib/supabase/server";
import AksiResep from "./aksi-resep";

type ItemResep = {
  id: string;
  dosis: string | null;
  frekuensi_per_hari: number | null;
  waktu_pemberian: string | null;
  durasi_hari: number | null;
  jumlah: number;
  catatan: string | null;
  dibatalkan: boolean;
  obat: { nama_obat: string; satuan: string; stok_saat_ini: number } | null;
};

type KomposisiRacikan = {
  id: string;
  obat_id: string;
  jumlah_total: number;
  dibatalkan: boolean;
  obat: { nama_obat: string; satuan: string; stok_saat_ini: number } | null;
};

type Racikan = {
  id: string;
  nama_racikan: string;
  jumlah_bungkus: number;
  waktu_pemberian: string | null;
  durasi_hari: number | null;
  catatan: string | null;
  komposisi: KomposisiRacikan[];
};

type Resep = {
  id: string;
  status: string;
  catatan: string | null;
  dibuat_pada: string;
  diserahkan_pada: string | null;
  kunjungan: {
    nomor_antrian: number;
    pasien: { nama_lengkap: string; no_rm: string } | null;
    klaster: { nama: string; kode_antrian: string | null } | null;
  } | null;
  items: ItemResep[];
  racikan: Racikan[];
};

const SELECT_RESEP = `
  id, status, catatan, dibuat_pada, diserahkan_pada,
  kunjungan:kunjungan_id (
    nomor_antrian,
    pasien:pasien_id (nama_lengkap, no_rm),
    klaster:klaster_tujuan_id (nama, kode_antrian)
  ),
  items:resep_obat_item (
    id, dosis, frekuensi_per_hari, waktu_pemberian, durasi_hari, jumlah, catatan, dibatalkan,
    obat:obat_id (nama_obat, satuan, stok_saat_ini)
  ),
  racikan:resep_racikan (
    id, nama_racikan, jumlah_bungkus, waktu_pemberian, durasi_hari, catatan,
    komposisi:resep_racikan_komposisi (
      id, obat_id, jumlah_total, dibatalkan,
      obat:obat_id (nama_obat, satuan, stok_saat_ini)
    )
  )
`;

function aturanPakai(it: ItemResep) {
  const bagian = [
    it.frekuensi_per_hari ? `${it.frekuensi_per_hari}x sehari` : null,
    it.waktu_pemberian,
    it.durasi_hari ? `selama ${it.durasi_hari} hari` : null,
  ].filter(Boolean);
  return bagian.join(", ") || "—";
}

function KartuResep({ r, bisaAksi }: { r: Resep; bisaAksi: boolean }) {
  const pasien = r.kunjungan?.pasien;
  const kl = r.kunjungan?.klaster;
  return (
    <div className="rounded-card border border-sand-100 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-extrabold text-ink">
            {kl?.kode_antrian ?? ""}
            {r.kunjungan?.nomor_antrian ?? ""} · {pasien?.nama_lengkap ?? "Pasien"}
          </p>
          <p className="text-xs text-ink/50">
            No. RM {pasien?.no_rm ?? "-"} · {kl?.nama ?? ""}
          </p>
          {r.catatan && <p className="mt-1 text-xs text-ink/60">Catatan: {r.catatan}</p>}
        </div>
        {bisaAksi && <AksiResep resepId={r.id} />}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="py-2 pr-4 font-medium">Obat</th>
              <th className="py-2 pr-4 font-medium">Dosis</th>
              <th className="py-2 pr-4 font-medium">Aturan pakai</th>
              <th className="py-2 pr-4 font-medium">Jumlah</th>
              <th className="py-2 font-medium">Stok</th>
            </tr>
          </thead>
          <tbody>
            {r.items
              .filter((it) => !it.dibatalkan)
              .map((it) => {
                const kurang = it.obat ? Number(it.obat.stok_saat_ini) < Number(it.jumlah) : true;
                return (
                  <tr key={it.id} className="border-b border-sand-100/70 last:border-0">
                    <td className="py-2.5 pr-4 text-ink">{it.obat?.nama_obat ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-ink/70">{it.dosis ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-ink/70">
                      {aturanPakai(it)}
                      {it.catatan && <span className="block text-xs text-ink/45">{it.catatan}</span>}
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-ink">
                      {it.jumlah} {it.obat?.satuan}
                    </td>
                    <td className="py-2.5">
                      {bisaAksi && (
                        <span className={kurang ? "font-medium text-clay-700" : "text-ink/50"}>
                          {kurang ? "Kurang" : `Sisa ${it.obat?.stok_saat_ini}`}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {r.racikan.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-sand-100 pt-4">
          {r.racikan.map((rac) => (
            <div key={rac.id} className="rounded-sm border border-teal-700/20 bg-teal-700/5 p-3.5">
              <p className="text-sm font-bold text-ink">
                {rac.nama_racikan} <span className="font-normal text-ink/50">· {rac.jumlah_bungkus} bungkus</span>
              </p>
              <p className="text-xs text-ink/50">
                {[rac.waktu_pemberian, rac.durasi_hari ? `selama ${rac.durasi_hari} hari` : null].filter(Boolean).join(", ") || "—"}
              </p>
              <ul className="mt-2 space-y-1">
                {rac.komposisi
                  .filter((k) => !k.dibatalkan)
                  .map((k) => {
                    const kurang = k.obat ? Number(k.obat.stok_saat_ini) < Number(k.jumlah_total) : true;
                    return (
                      <li key={k.id} className="flex items-center justify-between text-sm">
                        <span className="text-ink/70">{k.obat?.nama_obat ?? "—"}</span>
                        <span className="flex items-center gap-2">
                          <span className="font-medium text-ink">
                            {k.jumlah_total} {k.obat?.satuan}
                          </span>
                          {bisaAksi && (
                            <span className={`text-xs ${kurang ? "font-medium text-clay-700" : "text-ink/40"}`}>
                              {kurang ? "Kurang" : `Sisa ${k.obat?.stok_saat_ini}`}
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function HalamanResep() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !["admin", "farmasi"].includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus farmasi/admin.
      </div>
    );
  }
  const kodeAkses = await getKodeAksesSaya(pemanggil.id, pemanggil.peran);
  if (!punyaAkses(kodeAkses, "lintas_farmasi")) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Akunmu belum dikasih akses ke Farmasi. Minta admin nambahin akses klaster
        &quot;Lintas Klaster - Farmasi&quot; di halaman Data Pegawai.
      </div>
    );
  }

  const supabase = createClient();
  const [{ data: antrianMentah }, { data: riwayatMentah }] = await Promise.all([
    supabase
      .from("resep_obat")
      .select(SELECT_RESEP)
      .in("status", ["menunggu", "diracik"])
      .order("dibuat_pada", { ascending: true }),
    supabase
      .from("resep_obat")
      .select(SELECT_RESEP)
      .eq("status", "selesai")
      .order("diserahkan_pada", { ascending: false })
      .limit(10),
  ]);

  const antrian = (antrianMentah ?? []) as unknown as Resep[];
  const riwayat = (riwayatMentah ?? []) as unknown as Resep[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Verifikasi &amp; Penyerahan Resep</h1>
          <p className="mt-1.5 text-sm text-ink/60">
            Cek stok, verifikasi, lalu serahkan. Stok obat kepotong otomatis dan tercatat di kartu stok.
          </p>
        </div>
        <Link
          href="/dashboard/farmasi/resep/entri"
          className="rounded-sm bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900"
        >
          + Entri Resep Manual
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/45">
          Antrian ({antrian.length})
        </h2>
        {antrian.map((r) => (
          <KartuResep key={r.id} r={r} bisaAksi />
        ))}
        {antrian.length === 0 && (
          <div className="rounded-card border border-sand-100 bg-white px-5 py-6 text-center text-sm text-ink/45">
            Gak ada resep yang nunggu.
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/45">Terakhir diserahkan</h2>
        {riwayat.map((r) => (
          <KartuResep key={r.id} r={r} bisaAksi={false} />
        ))}
        {riwayat.length === 0 && (
          <div className="rounded-card border border-sand-100 bg-white px-5 py-6 text-center text-sm text-ink/45">
            Belum ada resep yang diserahkan.
          </div>
        )}
      </section>
    </div>
  );
}
