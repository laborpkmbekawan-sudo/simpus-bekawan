import { createClient } from "@/lib/supabase/server";
import FormSurvei from "./form-survei";

// Halaman publik: dibuka pasien sendiri lewat tablet ruang tunggu atau QR
// code, tanpa perlu login. Middleware hanya melindungi /dashboard, jadi
// halaman ini otomatis bisa diakses siapa saja.
export const dynamic = "force-dynamic";

export default async function HalamanSurvei() {
  const supabase = createClient();
  const { data: klaster } = await supabase.from("klaster").select("id, nama").order("urutan", { ascending: true });

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-sand-50 px-5 py-10">
      <div className="mb-6 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-teal-700">UPTD Puskesmas Bekawan</p>
        <h1 className="mt-1 text-xl font-extrabold text-ink">Survei Kepuasan Pasien</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Bantu kami meningkatkan pelayanan dengan mengisi survei singkat ini.
        </p>
      </div>

      <div className="rounded-card border border-sand-100 bg-white p-6 shadow-sm">
        <FormSurvei klaster={klaster ?? []} />
      </div>
    </div>
  );
}
