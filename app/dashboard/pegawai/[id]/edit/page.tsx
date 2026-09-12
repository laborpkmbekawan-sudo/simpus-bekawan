import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import FormEditPegawai from "./form-edit";

export default async function HalamanEditPegawai({
  params,
}: {
  params: { id: string };
}) {
  const pemanggil = await getPegawaiSaya();

  if (pemanggil?.peran !== "admin") {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin.
      </div>
    );
  }

  const supabase = createClient();

  const { data: pegawai } = await supabase
    .from("pegawai")
    .select("id, nama_lengkap, jabatan, unit_kerja, peran, lokasi_id")
    .eq("id", params.id)
    .single();

  if (!pegawai) {
    notFound();
  }

  const { data: daftarKlaster } = await supabase
    .from("klaster")
    .select("id, nama, kelompok")
    .order("urutan", { ascending: true });

  const { data: daftarLokasi } = await supabase
    .from("lokasi")
    .select("id, nama")
    .order("urutan", { ascending: true });

  const { data: aksesAwalMentah } = await supabase
    .from("akses_klaster")
    .select("klaster_id, level_akses")
    .eq("pegawai_id", params.id);

  const aksesAwal = (aksesAwalMentah ?? []).map((a) => ({
    klaster_id: a.klaster_id as string,
    level_akses: a.level_akses as "layanan" | "penuh",
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/pegawai"
          className="text-sm text-teal-900 underline decoration-teal-900/30 underline-offset-2"
        >
          ← Kembali ke Data Pegawai
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">
          Edit: {pegawai.nama_lengkap}
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Email login dan kata sandi gak diubah di sini. Buat reset kata sandi,
          hubungi lewat Supabase Authentication.
        </p>
      </div>

      <FormEditPegawai
        pegawai={pegawai}
        daftarKlaster={daftarKlaster ?? []}
        daftarLokasi={daftarLokasi ?? []}
        aksesAwal={aksesAwal}
      />
    </div>
  );
}
