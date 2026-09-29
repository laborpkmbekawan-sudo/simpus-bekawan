import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getPegawaiSaya, getKodeAksesSaya, punyaAkses } from "@/lib/supabase/server";
import { PERAN_LAB, umurTahun, type ParameterLab } from "@/lib/lab";
import FormHasilLab, { type ItemForm } from "./form-hasil";
import { PelacakLab, PilPrioritasLab } from "../komponen";

type ItemDb = {
  id: string;
  dibatalkan: boolean;
  pemeriksaan: { id: string; nama: string; parameter: ParameterLab[] } | null;
  hasil: { parameter_id: string; nilai: string; catatan: string | null }[];
};

function Pesan({ judul, isi, href, label }: { judul: string; isi: string; href: string; label: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-card border border-sand-100 bg-white p-8 text-center">
      <p className="text-lg font-bold text-ink">{judul}</p>
      <p className="mt-2 text-sm text-ink/60">{isi}</p>
      <Link href={href} className="mt-5 inline-block rounded-sm bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900">
        {label}
      </Link>
    </div>
  );
}

export default async function HalamanInputHasilLab({ params }: { params: { id: string } }) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil || !PERAN_LAB.includes(pemanggil.peran)) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus Laboratorium/admin.
      </div>
    );
  }
  const kodeAkses = await getKodeAksesSaya(pemanggil.id, pemanggil.peran);
  if (!punyaAkses(kodeAkses, "lintas_lab")) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Akunmu belum dikasih akses ke Laboratorium.
      </div>
    );
  }

  const supabase = createClient();
  const { data: p, error } = await supabase
    .from("lab_permintaan")
    .select(
      `id, no_lab, status, prioritas, diagnosis_kerja, catatan_klinis, diminta_oleh_nama,
       kunjungan:kunjungan_id (
         pasien:pasien_id (nama_lengkap, no_rm, jenis_kelamin, tanggal_lahir, alergi),
         klaster:klaster_tujuan_id (nama)
       )`
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    return <Pesan judul="Gagal memuat permintaan" isi={error.message} href="/dashboard/lab" label="Kembali ke Antrean" />;
  }
  if (!p) notFound();

  if (!["sampel_diterima", "proses"].includes(p.status)) {
    return (
      <Pesan
        judul={p.status === "diminta" ? "Sampel belum diterima" : p.status === "selesai" ? "Hasil sudah divalidasi" : "Permintaan dibatalkan"}
        isi={
          p.status === "diminta"
            ? "Terima sampel dulu di Antrean Permintaan sebelum input hasil."
            : p.status === "selesai"
              ? "Hasil sudah terkirim ke klaster dan tidak bisa diubah."
              : "Permintaan ini sudah dibatalkan."
        }
        href={p.status === "selesai" ? `/dashboard/lab/hasil/${p.id}` : "/dashboard/lab"}
        label={p.status === "selesai" ? "Lihat hasil" : "Kembali ke Antrean"}
      />
    );
  }

  const { data: itemMentah } = await supabase
    .from("lab_permintaan_item")
    .select(
      `id, dibatalkan,
       pemeriksaan:pemeriksaan_id (id, nama, parameter:lab_parameter (id, nama, satuan, tipe, pilihan, pilihan_normal, min_l, max_l, min_p, max_p, urutan, aktif)),
       hasil:lab_hasil (parameter_id, nilai, catatan)`
    )
    .eq("permintaan_id", p.id);

  const kunj = p.kunjungan as unknown as {
    pasien: { nama_lengkap: string; no_rm: string; jenis_kelamin: string | null; tanggal_lahir: string | null; alergi: string | null } | null;
    klaster: { nama: string } | null;
  } | null;
  const pasien = kunj?.pasien;

  const items: ItemForm[] = ((itemMentah ?? []) as unknown as ItemDb[])
    .filter((i) => !i.dibatalkan && i.pemeriksaan)
    .map((i) => {
      const tersimpan: ItemForm["tersimpan"] = {};
      for (const h of i.hasil) tersimpan[h.parameter_id] = { nilai: h.nilai, catatan: h.catatan ?? "" };
      return {
        id: i.id,
        nama: i.pemeriksaan!.nama,
        // Parameter yang sudah dinonaktifkan di katalog tetap tampil kalau sudah ada hasilnya.
        parameter: [...i.pemeriksaan!.parameter]
          .filter((par) => par.aktif || tersimpan[par.id])
          .sort((a, b) => a.urutan - b.urutan),
        tersimpan,
      };
    });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/lab" className="text-sm font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2">
          ← Kembali ke Antrean
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold text-ink">Input Hasil Laboratorium</h1>
        <p className="mt-1 text-sm text-ink/60">
          {p.no_lab} · Dari {kunj?.klaster?.nama ?? "klaster"}
          {p.diminta_oleh_nama ? ` · ${p.diminta_oleh_nama}` : ""}
        </p>
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
          <PilPrioritasLab prioritas={p.prioritas} />
        </div>
        {(p.diagnosis_kerja || p.catatan_klinis) && (
          <div className="space-y-0.5 text-sm text-ink/70">
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
        <PelacakLab status={p.status} />
        <p className="text-xs text-ink/45">
          Penanda rendah/tinggi dihitung otomatis dari nilai rujukan sesuai jenis kelamin pasien.
        </p>
      </section>

      <FormHasilLab permintaanId={p.id} jenisKelamin={pasien?.jenis_kelamin ?? null} items={items} />
    </div>
  );
}
