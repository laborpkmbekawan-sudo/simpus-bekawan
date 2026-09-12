"use client";

import { useState } from "react";

type Klaster = {
  id: string;
  nama: string;
  kelompok: string;
};

type BarisAkses = {
  idBaris: string; // key React doang, bukan id database
  klaster_id: string;
  level_akses: "layanan" | "penuh";
};

export default function PilihAksesKlaster({ daftarKlaster }: { daftarKlaster: Klaster[] }) {
  const [baris, setBaris] = useState<BarisAkses[]>([]);

  function tambahBaris() {
    setBaris((sebelum) => [
      ...sebelum,
      {
        idBaris: crypto.randomUUID(),
        klaster_id: daftarKlaster[0]?.id ?? "",
        level_akses: "layanan",
      },
    ]);
  }

  function hapusBaris(idBaris: string) {
    setBaris((sebelum) => sebelum.filter((b) => b.idBaris !== idBaris));
  }

  function ubahBaris(idBaris: string, perubahan: Partial<BarisAkses>) {
    setBaris((sebelum) =>
      sebelum.map((b) => (b.idBaris === idBaris ? { ...b, ...perubahan } : b))
    );
  }

  return (
    <div className="sm:col-span-2">
      <label className="text-sm font-medium text-ink">
        Akses klaster{" "}
        <span className="font-normal text-ink/45">(boleh lebih dari satu, opsional)</span>
      </label>

      <div className="mt-2 space-y-2">
        {baris.map((b) => (
          <div key={b.idBaris} className="flex items-center gap-2">
            <select
              value={b.klaster_id}
              onChange={(e) => ubahBaris(b.idBaris, { klaster_id: e.target.value })}
              className="flex-1 rounded-sm border border-teal-900/20 bg-white px-3 py-2 text-sm"
            >
              {daftarKlaster.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>

            <select
              value={b.level_akses}
              onChange={(e) =>
                ubahBaris(b.idBaris, {
                  level_akses: e.target.value === "penuh" ? "penuh" : "layanan",
                })
              }
              className="w-44 rounded-sm border border-teal-900/20 bg-white px-3 py-2 text-sm"
            >
              <option value="layanan">Layanan saja</option>
              <option value="penuh">Penuh (+ laporan)</option>
            </select>

            <button
              type="button"
              onClick={() => hapusBaris(b.idBaris)}
              aria-label="Hapus baris klaster ini"
              className="rounded-sm border border-teal-900/20 px-2.5 py-2 text-sm text-clay-700 hover:bg-clay-600/10"
            >
              Hapus
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={tambahBaris}
        disabled={daftarKlaster.length === 0}
        className="mt-2 rounded-sm border border-teal-900/20 px-3 py-1.5 text-xs font-medium text-teal-900
                   hover:bg-teal-900/5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        + Tambah klaster lagi
      </button>

      {/* Dikirim sebagai satu field JSON, diurai lagi di server action. */}
      <input type="hidden" name="akses_klaster" value={JSON.stringify(baris)} />
    </div>
  );
}
