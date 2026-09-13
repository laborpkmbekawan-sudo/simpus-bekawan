"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const LABEL_STATUS: Record<string, string> = { menunggu: "Menunggu", dipanggil: "Dipanggil", selesai: "Selesai" };
const WARNA_STATUS: Record<string, string> = {
  menunggu: "bg-ink/5 text-ink/60",
  dipanggil: "bg-teal-700/10 text-teal-700",
  selesai: "bg-clay-600/10 text-clay-700",
};

type KunjunganHariIni = {
  kunjunganId: string;
  pasienId: string;
  noRm: string;
  nik: string | null;
  namaPasien: string;
  jenisPenjamin: string | null;
  noBpjs: string | null;
  nomorTampil: string;
  namaKlaster: string;
  status: string;
};

type PasienMaster = {
  id: string;
  no_rm: string;
  nik: string | null;
  nama_lengkap: string;
  jenis_penjamin: string | null;
  no_bpjs: string | null;
};

export default function TabelDaftarPasien({
  tanggal,
  kunjunganHariIni,
  semuaPasien,
}: {
  tanggal: string;
  kunjunganHariIni: KunjunganHariIni[];
  semuaPasien: PasienMaster[];
}) {
  const [kataKunci, setKataKunci] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const modePencarian = kataKunci.trim() !== "";
  const hariIni = new Date().toISOString().slice(0, 10);

  function ubahTanggal(nilai: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tanggal", nilai);
    router.push(`?${params.toString()}`);
  }

  const hasilPencarian = useMemo(() => {
    if (!modePencarian) return [];
    const q = kataKunci.trim().toLowerCase();
    return semuaPasien.filter((p) =>
      [p.no_rm, p.nik ?? "", p.nama_lengkap].join(" ").toLowerCase().includes(q)
    );
  }, [semuaPasien, kataKunci, modePencarian]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={kataKunci}
          onChange={(e) => setKataKunci(e.target.value)}
          placeholder="Cari NIK / No. RM / Nama pasien lain..."
          className="w-full max-w-sm rounded-sm border border-sand-100 bg-white px-3.5 py-2 text-sm
                     placeholder:text-ink/40 focus:border-teal-700"
        />

        {!modePencarian && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={tanggal}
              onChange={(e) => ubahTanggal(e.target.value)}
              className="rounded-sm border border-sand-100 bg-white px-3 py-2 text-sm"
            />
            {tanggal !== hariIni && (
              <button
                onClick={() => ubahTanggal(hariIni)}
                className="text-xs font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
              >
                Kembali ke hari ini
              </button>
            )}
          </div>
        )}
      </div>

      {modePencarian ? (
        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                <th className="px-5 py-3 font-medium">No RM</th>
                <th className="px-5 py-3 font-medium">Nama</th>
                <th className="px-5 py-3 font-medium">NIK</th>
                <th className="px-5 py-3 font-medium">Penjamin</th>
                <th className="px-5 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {hasilPencarian.map((p) => (
                <tr key={p.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-5 py-3.5 font-medium text-ink">{p.no_rm}</td>
                  <td className="px-5 py-3.5 text-ink">{p.nama_lengkap}</td>
                  <td className="px-5 py-3.5 text-ink/70">{p.nik || "—"}</td>
                  <td className="px-5 py-3.5">
                    {p.jenis_penjamin && (
                      <span className="rounded-sm bg-teal-500/15 px-2 py-0.5 text-xs font-medium text-teal-700">
                        {p.jenis_penjamin.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/dashboard/pasien/${p.id}/kunjungan`}
                      className="text-xs font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
                    >
                      Daftar Kunjungan
                    </Link>
                  </td>
                </tr>
              ))}
              {hasilPencarian.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-sm text-ink/45">
                    Gak ada pasien yang cocok. Kalau memang belum pernah daftar, klik + Pasien Baru.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                <th className="px-5 py-3 font-medium">No. Antrian</th>
                <th className="px-5 py-3 font-medium">Nama</th>
                <th className="px-5 py-3 font-medium">No RM</th>
                <th className="px-5 py-3 font-medium">Klaster Tujuan</th>
                <th className="px-5 py-3 font-medium">Penjamin</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {kunjunganHariIni.map((k) => (
                <tr key={k.kunjunganId} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-5 py-3.5 font-medium text-ink">{k.nomorTampil}</td>
                  <td className="px-5 py-3.5 text-ink">{k.namaPasien}</td>
                  <td className="px-5 py-3.5 text-ink/70">{k.noRm}</td>
                  <td className="px-5 py-3.5 text-ink/70">{k.namaKlaster}</td>
                  <td className="px-5 py-3.5">
                    {k.jenisPenjamin && (
                      <span className="rounded-sm bg-teal-500/15 px-2 py-0.5 text-xs font-medium text-teal-700">
                        {k.jenisPenjamin.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-sm px-2 py-0.5 text-xs font-medium ${WARNA_STATUS[k.status]}`}>
                      {LABEL_STATUS[k.status] ?? k.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/dashboard/pasien/${k.pasienId}/kunjungan`}
                      className="text-xs font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
                    >
                      Kunjungan Lain
                    </Link>
                  </td>
                </tr>
              ))}
              {kunjunganHariIni.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-center text-sm text-ink/45">
                    Belum ada pasien yang berkunjung di tanggal ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
