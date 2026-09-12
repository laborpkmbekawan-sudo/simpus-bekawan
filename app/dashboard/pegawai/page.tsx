import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import FormTambahPegawai from "./form-tambah";
import ToggleStatus from "./toggle-status";

const LABEL_PERAN: Record<string, string> = {
  admin: "Admin",
  kapus: "Kepala Puskesmas",
  bendahara_bok: "Bendahara BOK",
  dokter: "Dokter",
  perawat: "Perawat",
  bidan: "Bidan",
  farmasi: "Farmasi",
  laboratorium: "Laboratorium",
  loket_rm_kasir: "Loket / RM / Kasir",
};

export default async function HalamanPegawai() {
  const pemanggil = await getPegawaiSaya();
  const isAdmin = pemanggil?.peran === "admin";
  const bolehLihat = isAdmin || pemanggil?.peran === "kapus";

  if (!bolehLihat) {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin dan Kepala Puskesmas. Hubungi admin sistem jika butuh akses.
      </div>
    );
  }

  const supabase = createClient();
  const { data: daftarPegawai } = await supabase
    .from("pegawai")
    .select("*")
    .order("nama_lengkap", { ascending: true });

  const { data: daftarKlaster } = await supabase
    .from("klaster")
    .select("id, nama, kelompok")
    .order("urutan", { ascending: true });

  const { data: semuaAksesKlaster } = await supabase
    .from("akses_klaster")
    .select("pegawai_id, level_akses, klaster:klaster_id (nama)");

  const aksesPerPegawai = new Map<string, { nama: string; level: string }[]>();
  for (const a of semuaAksesKlaster ?? []) {
    const daftar = aksesPerPegawai.get(a.pegawai_id) ?? [];
    const namaKlaster = (a.klaster as unknown as { nama: string } | null)?.nama ?? "—";
    daftar.push({ nama: namaKlaster, level: a.level_akses });
    aksesPerPegawai.set(a.pegawai_id, daftar);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Data Pegawai</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Kelola akun login dan hak akses seluruh pegawai puskesmas.
        </p>
      </div>

      {isAdmin && <FormTambahPegawai daftarKlaster={daftarKlaster ?? []} />}

      <div className="overflow-hidden rounded-sm border border-teal-900/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-teal-900/10 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-5 py-3 font-medium">Nama</th>
              <th className="px-5 py-3 font-medium">Jabatan</th>
              <th className="px-5 py-3 font-medium">Unit kerja</th>
              <th className="px-5 py-3 font-medium">Hak akses</th>
              <th className="px-5 py-3 font-medium">Akses klaster</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {daftarPegawai?.map((p) => (
              <tr key={p.id} className="border-b border-teal-900/5 last:border-0">
                <td className="px-5 py-3.5 text-ink">{p.nama_lengkap}</td>
                <td className="px-5 py-3.5 text-ink/70">{p.jabatan || "—"}</td>
                <td className="px-5 py-3.5 text-ink/70">{p.unit_kerja || "—"}</td>
                <td className="px-5 py-3.5 text-ink/70">
                  {LABEL_PERAN[p.peran] ?? p.peran}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {(aksesPerPegawai.get(p.id) ?? []).map((a, i) => (
                      <span
                        key={i}
                        className={`rounded-sm px-2 py-0.5 text-xs ${
                          a.level === "penuh"
                            ? "bg-teal-900/8 text-teal-900"
                            : "bg-ink/5 text-ink/60"
                        }`}
                        title={a.level === "penuh" ? "Penuh (+ laporan)" : "Layanan saja"}
                      >
                        {a.nama.replace(/^Klaster \d+ - /, "").replace(/^Lintas Klaster - /, "")}
                      </span>
                    ))}
                    {(aksesPerPegawai.get(p.id) ?? []).length === 0 && (
                      <span className="text-xs text-ink/35">—</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  {isAdmin ? (
                    <ToggleStatus pegawaiId={p.id} statusAktif={p.status_aktif} />
                  ) : (
                    <span className="text-xs text-ink/50">
                      {p.status_aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {(!daftarPegawai || daftarPegawai.length === 0) && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-sm text-ink/45">
                  Belum ada data pegawai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
