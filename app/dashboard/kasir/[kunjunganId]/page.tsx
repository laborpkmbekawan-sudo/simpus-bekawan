import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import FormPembayaran from "./form-pembayaran";

export default async function HalamanProsesBayar({
  params,
}: {
  params: { kunjunganId: string };
}) {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return null;

  const supabase = createClient();

  const [{ data: kunjungan }, { data: shiftAktif }, { data: daftarTarif }, { data: tindakanMentah }] =
    await Promise.all([
      supabase
        .from("kunjungan")
        .select(
          "id, jenis_penjamin, pasien:pasien_id (no_rm, nama_lengkap, jenis_penjamin), klaster:klaster_tujuan_id (nama)"
        )
        .eq("id", params.kunjunganId)
        .single(),
      supabase
        .from("shift_kasir")
        .select("id")
        .eq("pegawai_id", pemanggil.id)
        .eq("status", "buka")
        .maybeSingle(),
      supabase.from("tarif_layanan").select("id, nama_layanan, harga").eq("aktif", true).order("nama_layanan"),
      supabase
        .from("kunjungan_tindakan")
        .select("id, tarif:tarif_layanan_id (id, nama_layanan, harga)")
        .eq("kunjungan_id", params.kunjunganId)
        .eq("dibatalkan", false),
    ]);

  if (!kunjungan) {
    notFound();
  }
  if (!shiftAktif) {
    redirect("/dashboard/kasir");
  }

  const pasien = kunjungan.pasien as unknown as { no_rm: string; nama_lengkap: string; jenis_penjamin: string } | null;
  const klaster = kunjungan.klaster as unknown as { nama: string } | null;

  const tindakanTercatat = (tindakanMentah ?? [])
    .map((t) => t.tarif as unknown as { id: string; nama_layanan: string; harga: number } | null)
    .filter((t): t is { id: string; nama_layanan: string; harga: number } => !!t);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/kasir"
          className="text-sm font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
        >
          ← Kembali ke Kasir
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold text-ink">Proses Pembayaran</h1>
      </div>

      <div className="rounded-card border border-sand-100 bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-ink/40">Pasien</p>
        <p className="text-lg font-bold text-ink">{pasien?.nama_lengkap}</p>
        <p className="text-sm text-ink/60">
          No. RM {pasien?.no_rm} · {klaster?.nama}
        </p>
      </div>

      <FormPembayaran
        kunjunganId={kunjungan.id}
        shiftId={shiftAktif.id}
        jenisPenjamin={kunjungan.jenis_penjamin ?? pasien?.jenis_penjamin ?? "umum"}
        daftarTarif={daftarTarif ?? []}
        tindakanTercatat={tindakanTercatat}
      />
    </div>
  );
}
