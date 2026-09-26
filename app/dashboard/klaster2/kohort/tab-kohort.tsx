"use client";

import { useState } from "react";
import Link from "next/link";

export type BarisKohortIbu = {
  pasienId: string;
  noRm: string;
  nama: string;
  tanggalKunjunganTerakhir: string;
  usiaKehamilanMinggu: number | null;
  hpl: string | null;
  statusRisiko: string;
  faktorRisiko: string | null;
};

export type BarisKohortAnak = {
  pasienId: string;
  noRm: string;
  nama: string;
  tanggalKunjunganTerakhir: string;
  umurBulan: number | null;
  beratBadan: number | null;
  panjangTinggiBadan: number | null;
  statusGizi: string | null;
  statusTumbuhKembang: string | null;
};

const LABEL_GIZI: Record<string, string> = {
  gizi_buruk: "Gizi Buruk",
  gizi_kurang: "Gizi Kurang",
  gizi_baik: "Gizi Baik",
  gizi_lebih: "Gizi Lebih",
};

const LABEL_TUMBUH_KEMBANG: Record<string, string> = {
  sesuai: "Sesuai",
  meragukan: "Meragukan",
  penyimpangan: "Penyimpangan",
};

function tanggalPendek(tanggal: string) {
  return new Date(`${tanggal}T00:00:00Z`).toLocaleDateString("id-ID", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function BadgeRisiko({ status }: { status: string }) {
  const tinggi = status === "tinggi";
  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
        tinggi ? "bg-clay-600/10 text-clay-700" : "bg-teal-700/10 text-teal-700"
      }`}
    >
      {tinggi ? "Risiko Tinggi" : "Risiko Rendah"}
    </span>
  );
}

function BadgeGizi({ status }: { status: string | null }) {
  if (!status) return <span className="text-ink/40">—</span>;
  const bermasalah = status === "gizi_buruk" || status === "gizi_kurang" || status === "gizi_lebih";
  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
        bermasalah ? "bg-clay-600/10 text-clay-700" : "bg-teal-700/10 text-teal-700"
      }`}
    >
      {LABEL_GIZI[status] ?? status}
    </span>
  );
}

function BadgeTumbuhKembang({ status }: { status: string | null }) {
  if (!status) return <span className="text-ink/40">—</span>;
  const bermasalah = status !== "sesuai";
  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
        bermasalah ? "bg-clay-600/10 text-clay-700" : "bg-teal-700/10 text-teal-700"
      }`}
    >
      {LABEL_TUMBUH_KEMBANG[status] ?? status}
    </span>
  );
}

export default function TabKohort({
  kohortIbu,
  kohortAnak,
}: {
  kohortIbu: BarisKohortIbu[];
  kohortAnak: BarisKohortAnak[];
}) {
  const [tabAktif, setTabAktif] = useState<"ibu" | "anak">("ibu");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-sand-100 pb-3">
        {[
          { id: "ibu" as const, label: `Kohort Ibu Hamil (${kohortIbu.length})` },
          { id: "anak" as const, label: `Kohort Bayi & Balita (${kohortAnak.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTabAktif(tab.id)}
            className={`rounded-sm px-3.5 py-2 text-sm font-medium ${
              tabAktif === tab.id ? "bg-teal-700 text-white" : "text-ink/60 hover:bg-sand-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabAktif === "ibu" ? (
        <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                <th className="px-5 py-3 font-medium">No RM</th>
                <th className="px-5 py-3 font-medium">Nama</th>
                <th className="px-5 py-3 font-medium">Kunjungan Terakhir</th>
                <th className="px-5 py-3 font-medium">Usia Kehamilan</th>
                <th className="px-5 py-3 font-medium">HPL</th>
                <th className="px-5 py-3 font-medium">Risiko</th>
                <th className="px-5 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {kohortIbu.map((i) => (
                <tr key={i.pasienId} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-5 py-3.5 font-medium text-ink">{i.noRm}</td>
                  <td className="px-5 py-3.5 text-ink">{i.nama}</td>
                  <td className="px-5 py-3.5 text-ink/70">{tanggalPendek(i.tanggalKunjunganTerakhir)}</td>
                  <td className="px-5 py-3.5 text-ink/70">
                    {i.usiaKehamilanMinggu != null ? `${i.usiaKehamilanMinggu} minggu` : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-ink/70">{i.hpl ? tanggalPendek(i.hpl) : "—"}</td>
                  <td className="px-5 py-3.5">
                    <BadgeRisiko status={i.statusRisiko} />
                    {i.faktorRisiko && <p className="mt-0.5 text-xs text-ink/45">{i.faktorRisiko}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/dashboard/rekam-medis/${i.pasienId}`}
                      className="text-xs font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
                    >
                      Rekam Medis
                    </Link>
                  </td>
                </tr>
              ))}
              {kohortIbu.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-center text-sm text-ink/45">
                    Gak ada ibu hamil dalam pemantauan ~10 bulan terakhir.
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
                <th className="px-5 py-3 font-medium">No RM</th>
                <th className="px-5 py-3 font-medium">Nama</th>
                <th className="px-5 py-3 font-medium">Umur</th>
                <th className="px-5 py-3 font-medium">Kunjungan Terakhir</th>
                <th className="px-5 py-3 font-medium">BB / PB-TB</th>
                <th className="px-5 py-3 font-medium">Status Gizi</th>
                <th className="px-5 py-3 font-medium">Tumbuh Kembang</th>
                <th className="px-5 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {kohortAnak.map((a) => (
                <tr key={a.pasienId} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-5 py-3.5 font-medium text-ink">{a.noRm}</td>
                  <td className="px-5 py-3.5 text-ink">{a.nama}</td>
                  <td className="px-5 py-3.5 text-ink/70">{a.umurBulan != null ? `${a.umurBulan} bln` : "—"}</td>
                  <td className="px-5 py-3.5 text-ink/70">{tanggalPendek(a.tanggalKunjunganTerakhir)}</td>
                  <td className="px-5 py-3.5 text-ink/70">
                    {a.beratBadan != null ? `${a.beratBadan} kg` : "—"} /{" "}
                    {a.panjangTinggiBadan != null ? `${a.panjangTinggiBadan} cm` : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <BadgeGizi status={a.statusGizi} />
                  </td>
                  <td className="px-5 py-3.5">
                    <BadgeTumbuhKembang status={a.statusTumbuhKembang} />
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/dashboard/rekam-medis/${a.pasienId}`}
                      className="text-xs font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
                    >
                      Rekam Medis
                    </Link>
                  </td>
                </tr>
              ))}
              {kohortAnak.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-6 text-center text-sm text-ink/45">
                    Gak ada bayi/balita di bawah 5 tahun dalam pemantauan ~5 tahun terakhir.
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
