import Link from "next/link";
import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import FormBukaShift from "./form-buka-shift";
import PanelShiftAktif from "./panel-shift-aktif";

export default async function HalamanKasir() {
  const pemanggil = await getPegawaiSaya();
  if (!pemanggil) return null;

  const supabase = createClient();
  const hariIni = new Date().toISOString().slice(0, 10);

  const { data: shiftAktif } = await supabase
    .from("shift_kasir")
    .select("id, modal_awal, dibuka_pada")
    .eq("pegawai_id", pemanggil.id)
    .eq("status", "buka")
    .maybeSingle();

  if (!shiftAktif) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold text-ink">Kasir</h1>
        <FormBukaShift />
      </div>
    );
  }

  const [{ data: kunjunganHariIni }, { data: tagihanShift }] = await Promise.all([
    supabase
      .from("kunjungan")
      .select("id, pasien:pasien_id (no_rm, nama_lengkap), klaster:klaster_tujuan_id (nama)")
      .eq("tanggal", hariIni),
    supabase.from("tagihan").select("id, total_tagihan, status_pembayaran").eq("shift_id", shiftAktif.id),
  ]);

  const kunjunganIdSudahBayar = new Set(
    (await supabase.from("tagihan").select("kunjungan_id")).data?.map((t) => t.kunjungan_id) ?? []
  );

  const belumBayar = (kunjunganHariIni ?? []).filter((k) => !kunjunganIdSudahBayar.has(k.id));

  const totalTunai = (tagihanShift ?? [])
    .filter((t) => t.status_pembayaran === "lunas")
    .reduce((jumlah, t) => jumlah + Number(t.total_tagihan), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-ink">Kasir</h1>

      <PanelShiftAktif
        shiftId={shiftAktif.id}
        modalAwal={Number(shiftAktif.modal_awal)}
        dibukaPada={shiftAktif.dibuka_pada}
        totalTunai={totalTunai}
        jumlahTransaksi={(tagihanShift ?? []).filter((t) => t.status_pembayaran === "lunas").length}
      />

      <div>
        <p className="mb-2 text-sm font-bold text-ink">Belum Dibayar Hari Ini ({belumBayar.length})</p>
        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                <th className="px-5 py-3 font-medium">No RM</th>
                <th className="px-5 py-3 font-medium">Nama</th>
                <th className="px-5 py-3 font-medium">Klaster</th>
                <th className="px-5 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {belumBayar.map((k) => {
                const pasien = k.pasien as unknown as { no_rm: string; nama_lengkap: string } | null;
                const klaster = k.klaster as unknown as { nama: string } | null;
                return (
                  <tr key={k.id} className="border-b border-sand-100/70 last:border-0">
                    <td className="px-5 py-3.5 font-medium text-ink">{pasien?.no_rm ?? "—"}</td>
                    <td className="px-5 py-3.5 text-ink">{pasien?.nama_lengkap ?? "—"}</td>
                    <td className="px-5 py-3.5 text-ink/70">{klaster?.nama ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/dashboard/kasir/${k.id}`}
                        className="text-xs font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
                      >
                        Proses Bayar
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {belumBayar.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-sm text-ink/45">
                    Semua kunjungan hari ini udah diproses.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
