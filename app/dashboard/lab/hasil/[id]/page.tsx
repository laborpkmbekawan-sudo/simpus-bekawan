import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import { PERAN_KLINIS_LAB, PERAN_LAB, umurTahun } from "@/lib/lab";
import { PelacakLab, PilPrioritasLab, PilStatusLab, TabelHasilLab, type ItemHasil } from "../../komponen";
import TandaiDilihatLab from "../tandai-dilihat";
import AksiAntreanLab from "../../aksi-antrean";
import { waktuWib } from "@/lib/format";

type ItemDb = {
  id: string;
  dibatalkan: boolean;
  pemeriksaan: { nama: string } | null;
  hasil: ItemHasil["hasil"];
};

export default async function HalamanDetailHasilLab({ params }: { params: { id: string } }) {
  const pemanggil = await getPegawaiSaya();
  const boleh = pemanggil && [...PERAN_LAB, ...PERAN_KLINIS_LAB, "kapus"].includes(pemanggil.peran);
  if (!pemanggil || !boleh) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini untuk petugas layanan dan Laboratorium.
      </div>
    );
  }

  const supabase = createClient();
  const { data: p } = await supabase
    .from("lab_permintaan")
    .select(
      `id, no_lab, status, prioritas, diagnosis_kerja, catatan_klinis, catatan_validasi, alasan_batal,
       diminta_oleh, diminta_oleh_nama, diminta_pada, sampel_diterima_pada, divalidasi_oleh_nama, divalidasi_pada, hasil_dilihat_pada,
       kunjungan:kunjungan_id (
         id,
         pasien:pasien_id (nama_lengkap, no_rm, jenis_kelamin, tanggal_lahir),
         klaster:klaster_tujuan_id (nama)
       )`
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!p) notFound();

  const { data: itemMentah } = await supabase
    .from("lab_permintaan_item")
    .select("id, dibatalkan, pemeriksaan:pemeriksaan_id (nama), hasil:lab_hasil (id, nama_parameter, satuan, rujukan_teks, nilai, flag, catatan, parameter:parameter_id (urutan))")
    .eq("permintaan_id", p.id);

  const kunj = p.kunjungan as unknown as {
    id: string;
    pasien: { nama_lengkap: string; no_rm: string; jenis_kelamin: string | null; tanggal_lahir: string | null } | null;
    klaster: { nama: string } | null;
  } | null;
  const pasien = kunj?.pasien;

  const items: ItemHasil[] = ((itemMentah ?? []) as unknown as ItemDb[])
    .filter((i) => !i.dibatalkan)
    .map((i) => ({ id: i.id, nama: i.pemeriksaan?.nama ?? "—", hasil: i.hasil }));

  const lab = PERAN_LAB.includes(pemanggil.peran);
  const peminta = p.diminta_oleh === pemanggil.id;
  const adaAbnormal = items.some((i) => i.hasil.some((h) => h.flag && h.flag !== "normal"));

  return (
    <div className="space-y-6">
      {p.status === "selesai" && peminta && !p.hasil_dilihat_pada && <TandaiDilihatLab id={p.id} />}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={lab ? "/dashboard/lab" : "/dashboard/lab/hasil"}
            className="text-sm font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
          >
            ← Kembali
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold text-ink">Hasil Laboratorium</h1>
          <p className="mt-1 text-sm text-ink/60">
            {p.no_lab} · {kunj?.klaster?.nama ?? "klaster"}
            {p.diminta_oleh_nama ? ` · Diminta ${p.diminta_oleh_nama}` : ""}
          </p>
        </div>
        {p.status === "selesai" && (
          <Link
            href={`/dashboard/lab/${p.id}/cetak`}
            className="rounded-sm bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900"
          >
            Cetak hasil
          </Link>
        )}
      </div>

      <section className="space-y-3 rounded-card border border-sand-100 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-ink">{pasien?.nama_lengkap ?? "Pasien"}</p>
            <p className="text-sm text-ink/60">
              No. RM {pasien?.no_rm ?? "-"} · {pasien?.jenis_kelamin === "L" ? "Laki-laki" : pasien?.jenis_kelamin === "P" ? "Perempuan" : "—"} ·{" "}
              {umurTahun(pasien?.tanggal_lahir ?? null)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PilPrioritasLab prioritas={p.prioritas} />
            <PilStatusLab status={p.status} />
          </div>
        </div>
        <PelacakLab status={p.status} />
        <p className="text-xs text-ink/45">
          Diminta {waktuWib(p.diminta_pada)}
          {p.sampel_diterima_pada ? ` · Sampel diterima ${waktuWib(p.sampel_diterima_pada)}` : ""}
          {p.divalidasi_pada ? ` · Divalidasi ${waktuWib(p.divalidasi_pada)}${p.divalidasi_oleh_nama ? ` oleh ${p.divalidasi_oleh_nama}` : ""}` : ""}
        </p>
        {(p.diagnosis_kerja || p.catatan_klinis) && (
          <div className="space-y-0.5 border-t border-sand-100 pt-3 text-sm text-ink/70">
            {p.diagnosis_kerja && (
              <p>
                <span className="font-bold">Diagnosis kerja:</span> {p.diagnosis_kerja}
              </p>
            )}
            {p.catatan_klinis && (
              <p>
                <span className="font-bold">Catatan klinis:</span> {p.catatan_klinis}
              </p>
            )}
          </div>
        )}
        {p.status === "dibatalkan" && (
          <p className="rounded-sm bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
            Permintaan dibatalkan{p.alasan_batal ? `: ${p.alasan_batal}` : "."}
          </p>
        )}
      </section>

      {p.status === "selesai" ? (
        <section className="space-y-4 rounded-card border border-sand-100 bg-white p-5">
          {adaAbnormal && (
            <p className="rounded-sm bg-clay-600/10 px-3.5 py-2.5 text-sm text-clay-700">
              Ada hasil di luar nilai rujukan (ditandai merah/oranye).
            </p>
          )}
          <TabelHasilLab items={items} />
          {p.catatan_validasi && (
            <p className="border-t border-sand-100 pt-3 text-sm text-ink/70">
              <span className="font-bold">Catatan Lab:</span> {p.catatan_validasi}
            </p>
          )}
        </section>
      ) : p.status !== "dibatalkan" ? (
        <section className="rounded-card border border-sand-100 bg-white px-5 py-6 text-center text-sm text-ink/55">
          Hasil belum keluar. Halaman ini otomatis diperbarui saat Lab memvalidasi hasil.
        </section>
      ) : null}

      {(lab || (peminta && p.status === "diminta")) && p.status !== "selesai" && p.status !== "dibatalkan" && (
        <AksiAntreanLab id={p.id} status={p.status} bisaLab={lab} />
      )}
    </div>
  );
}
