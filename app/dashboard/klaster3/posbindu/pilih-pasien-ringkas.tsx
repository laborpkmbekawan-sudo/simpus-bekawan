"use client";

import { useEffect, useState } from "react";
import { cariPasienKlaster3Action } from "./actions";

type HasilCari = { pasienId: string; noRm: string; nama: string; nik: string | null };

// Versi ringkas dari pemilih pasien (beda dari punya modul Rujukan): gak
// ada daftar "terdaftar hari ini" -- kegiatan Posbindu & kontrol Prolanis
// gak selalu lewat antrean kunjungan.
export default function PilihPasienRingkas({ formKey }: { formKey: number }) {
  const [pilihan, setPilihan] = useState<HasilCari | null>(null);
  const [kata, setKata] = useState("");
  const [hasil, setHasil] = useState<HasilCari[]>([]);
  const [mencari, setMencari] = useState(false);

  // Reset pilihan tiap form berhasil disimpan (parent naikkan formKey).
  useEffect(() => {
    setPilihan(null);
    setKata("");
    setHasil([]);
  }, [formKey]);

  useEffect(() => {
    if (pilihan || kata.trim().length < 2) {
      setHasil([]);
      setMencari(false);
      return;
    }
    let batal = false;
    setMencari(true);
    const tunda = setTimeout(async () => {
      const r = await cariPasienKlaster3Action(kata);
      if (batal) return;
      setHasil(r);
      setMencari(false);
    }, 300);
    return () => {
      batal = true;
      clearTimeout(tunda);
    };
  }, [kata, pilihan]);

  return (
    <div className="space-y-1.5 sm:col-span-3">
      <span className="text-sm font-bold text-ink/80">Pasien</span>

      {pilihan ? (
        <div className="flex items-center justify-between gap-3 rounded-sm border border-teal-700/30 bg-teal-500/10 px-3.5 py-2.5">
          <div>
            <p className="text-sm font-semibold text-ink">{pilihan.nama}</p>
            <p className="text-xs text-ink/60">RM {pilihan.noRm}</p>
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
          <input type="hidden" name="pasien_id" value={pilihan.pasienId} />
        </div>
      ) : (
        <div className="rounded-sm border border-sand-100 bg-[#FBFDFF]">
          <input
            value={kata}
            onChange={(e) => setKata(e.target.value)}
            placeholder="Cari nama, No. RM, atau NIK (min. 2 huruf)"
            aria-label="Cari pasien"
            className="w-full rounded-sm border-b border-sand-100 bg-transparent px-3.5 py-2.5 text-sm outline-none"
          />
          {kata.trim().length >= 2 && (
            <div className="max-h-56 overflow-y-auto">
              {mencari ? (
                <p className="px-3.5 py-3 text-sm text-ink/45">Mencari...</p>
              ) : hasil.length === 0 ? (
                <p className="px-3.5 py-3 text-sm text-ink/45">Tidak ditemukan.</p>
              ) : (
                hasil.map((p) => (
                  <button
                    key={p.pasienId}
                    type="button"
                    onClick={() => setPilihan(p)}
                    className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-sand-50"
                  >
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
