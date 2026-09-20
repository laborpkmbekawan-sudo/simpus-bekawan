"use client";

import { useEffect, useMemo, useState } from "react";
import { cariPasienAction } from "./actions";

export type PasienTerdaftar = {
  kunjunganId: string;
  noRm: string;
  nama: string;
  nomorTampil: string;
  namaKlaster: string;
  status: string;
};

type Pilihan = { noRm: string; nama: string; kunjunganId: string | null; keterangan: string | null };
type HasilCari = { noRm: string; nama: string; nik: string | null };

const LABEL_STATUS: Record<string, string> = { menunggu: "Menunggu", dipanggil: "Dipanggil", selesai: "Selesai" };

// Pemilih pasien untuk rujukan dari Puskesmas Induk: pasien yang didaftarkan
// petugas pendaftaran hari ini tinggal dipilih. Pasien lain bisa dicari
// lewat nama / No. RM / NIK.
export default function PilihPasien({
  terdaftarHariIni,
  awal,
}: {
  terdaftarHariIni: PasienTerdaftar[];
  awal: { noRm: string; nama: string; kunjunganId: string | null } | null;
}) {
  const [pilihan, setPilihan] = useState<Pilihan | null>(
    awal ? { noRm: awal.noRm, nama: awal.nama, kunjunganId: awal.kunjunganId, keterangan: null } : null
  );
  const [kata, setKata] = useState("");
  const [hasilCari, setHasilCari] = useState<HasilCari[]>([]);
  const [mencari, setMencari] = useState(false);

  const kataKecil = kata.trim().toLowerCase();

  const cocokHariIni = useMemo(
    () =>
      terdaftarHariIni.filter(
        (p) => !kataKecil || p.nama.toLowerCase().includes(kataKecil) || p.noRm.toLowerCase().includes(kataKecil)
      ),
    [terdaftarHariIni, kataKecil]
  );

  // Cari ke seluruh data pasien setelah berhenti mengetik sebentar.
  useEffect(() => {
    if (pilihan || kata.trim().length < 3) {
      setHasilCari([]);
      setMencari(false);
      return;
    }
    let batal = false;
    setMencari(true);
    const tunda = setTimeout(async () => {
      const hasil = await cariPasienAction(kata);
      if (batal) return;
      setHasilCari(hasil);
      setMencari(false);
    }, 300);
    return () => {
      batal = true;
      clearTimeout(tunda);
    };
  }, [kata, pilihan]);

  function pilihDariHariIni(p: PasienTerdaftar) {
    setPilihan({
      noRm: p.noRm,
      nama: p.nama,
      kunjunganId: p.kunjunganId,
      keterangan: `Antrian ${p.nomorTampil} · ${p.namaKlaster}`,
    });
  }

  function pilihDariCari(p: HasilCari) {
    setPilihan({ noRm: p.noRm, nama: p.nama, kunjunganId: null, keterangan: null });
  }

  // Pasien yang sudah tampil di daftar hari ini tidak diulang di hasil cari.
  const rmHariIni = new Set(terdaftarHariIni.map((p) => p.noRm));
  const pasienLain = hasilCari.filter((p) => !rmHariIni.has(p.noRm));

  const itemCls = "flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-sand-50";

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-bold text-ink/80">Pasien yang dirujuk</span>

      {pilihan ? (
        <div className="flex items-center justify-between gap-3 rounded-sm border border-teal-700/30 bg-teal-500/10 px-3.5 py-2.5">
          <div>
            <p className="text-sm font-semibold text-ink">{pilihan.nama}</p>
            <p className="text-xs text-ink/60">
              RM {pilihan.noRm}
              {pilihan.keterangan ? ` · ${pilihan.keterangan}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPilihan(null);
              setKata("");
            }}
            className="text-xs font-medium text-clay-700 underline decoration-clay-700/30 underline-offset-2"
          >
            Ganti
          </button>
          <input type="hidden" name="no_rm" value={pilihan.noRm} />
          <input type="hidden" name="kunjungan_id" value={pilihan.kunjunganId ?? ""} />
        </div>
      ) : (
        <div className="rounded-sm border border-sand-100 bg-[#FBFDFF]">
          <input
            value={kata}
            onChange={(e) => setKata(e.target.value)}
            placeholder="Cari nama, No. RM, atau NIK"
            aria-label="Cari pasien"
            className="w-full rounded-t-sm border-b border-sand-100 bg-transparent px-3.5 py-2.5 text-sm outline-none"
          />

          <div className="max-h-64 overflow-y-auto">
            <p className="bg-sand-50 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink/45">
              Terdaftar hari ini
            </p>
            {cocokHariIni.length === 0 ? (
              <p className="px-3.5 py-3 text-sm text-ink/45">
                {terdaftarHariIni.length === 0
                  ? "Belum ada pasien terdaftar hari ini."
                  : "Tidak ada yang cocok di pendaftaran hari ini."}
              </p>
            ) : (
              cocokHariIni.map((p) => (
                <button key={p.kunjunganId} type="button" onClick={() => pilihDariHariIni(p)} className={itemCls}>
                  <span>
                    <span className="font-semibold text-ink">{p.nama}</span>
                    <span className="block text-xs text-ink/50">
                      RM {p.noRm} · Antrian {p.nomorTampil} · {p.namaKlaster}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-sm bg-ink/5 px-2 py-0.5 text-[11px] font-medium text-ink/60">
                    {LABEL_STATUS[p.status] ?? p.status}
                  </span>
                </button>
              ))
            )}

            {kata.trim().length >= 3 && (
              <>
                <p className="bg-sand-50 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink/45">
                  Pasien lain
                </p>
                {mencari ? (
                  <p className="px-3.5 py-3 text-sm text-ink/45">Mencari...</p>
                ) : pasienLain.length === 0 ? (
                  <p className="px-3.5 py-3 text-sm text-ink/45">Tidak ditemukan.</p>
                ) : (
                  pasienLain.map((p) => (
                    <button key={p.noRm} type="button" onClick={() => pilihDariCari(p)} className={itemCls}>
                      <span>
                        <span className="font-semibold text-ink">{p.nama}</span>
                        <span className="block text-xs text-ink/50">
                          RM {p.noRm}
                          {p.nik ? ` · NIK ${p.nik}` : ""}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
