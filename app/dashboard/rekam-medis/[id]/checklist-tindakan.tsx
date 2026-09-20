"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { batalkanTindakanAction, catatTindakanAction } from "./actions";

type Tarif = { id: string; nama_layanan: string; harga: number; kategori: string };
type ResepBaris = { bhp_id: string; nama_bhp: string; satuan: string; jumlah_default: number };
type TindakanTercatat = {
  id: string;
  namaLayanan: string;
  dicatatPada: string;
  items: { namaBhp: string; jumlah: number; satuan: string }[];
};

function TombolCatat() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Catat Tindakan"}
    </button>
  );
}

export default function ChecklistTindakan({
  kunjunganId,
  pasienId,
  daftarTarif,
  resepPerTarif,
  tindakanTercatat,
}: {
  kunjunganId: string;
  pasienId: string;
  daftarTarif: Tarif[];
  resepPerTarif: Record<string, ResepBaris[]>;
  tindakanTercatat: TindakanTercatat[];
}) {
  const [state, formAction] = useFormState(catatTindakanAction, null);
  const [tarifDipilih, setTarifDipilih] = useState("");
  const [jumlahBhp, setJumlahBhp] = useState<Record<string, number>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const perKategori = useMemo(() => {
    const map = new Map<string, Tarif[]>();
    for (const t of daftarTarif) {
      const daftar = map.get(t.kategori) ?? [];
      daftar.push(t);
      map.set(t.kategori, daftar);
    }
    return map;
  }, [daftarTarif]);

  const resepAktif = tarifDipilih ? resepPerTarif[tarifDipilih] ?? [] : [];

  useEffect(() => {
    // Pas ganti tindakan, reset jumlah BHP ke default resepnya.
    const awal: Record<string, number> = {};
    for (const r of resepAktif) awal[r.bhp_id] = r.jumlah_default;
    setJumlahBhp(awal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tarifDipilih]);

  useEffect(() => {
    if (state?.sukses) {
      setTarifDipilih("");
      formRef.current?.reset();
    }
  }, [state]);

  const daftarBhpUntukKirim = resepAktif.map((r) => ({
    bhp_id: r.bhp_id,
    jumlah: jumlahBhp[r.bhp_id] ?? 0,
  }));

  return (
    <div className="space-y-5">
      <form ref={formRef} action={formAction} className="space-y-4 rounded-card border border-sand-100 bg-white p-5">
        <input type="hidden" name="kunjungan_id" value={kunjunganId} />
        <input type="hidden" name="pasien_id" value={pasienId} />
        <input type="hidden" name="tarif_layanan_id" value={tarifDipilih} />
        <input type="hidden" name="daftar_bhp" value={JSON.stringify(daftarBhpUntukKirim)} />

        <div className="space-y-1.5">
          <label htmlFor="pilih_tindakan" className="text-sm font-bold text-ink/80">
            Pilih tindakan yang dilakukan
          </label>
          <select
            id="pilih_tindakan"
            value={tarifDipilih}
            onChange={(e) => setTarifDipilih(e.target.value)}
            className="w-full rounded-sm border border-sand-100 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">Pilih tindakan...</option>
            {[...perKategori.entries()].map(([kategori, daftar]) => (
              <optgroup key={kategori} label={kategori}>
                {daftar.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nama_layanan}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {tarifDipilih && resepAktif.length > 0 && (
          <div className="space-y-2 rounded-sm border border-sand-100 bg-sand-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
              BHP yang kepake (bisa diedit)
            </p>
            {resepAktif.map((r) => (
              <div key={r.bhp_id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink">{r.nama_bhp}</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    value={jumlahBhp[r.bhp_id] ?? 0}
                    onChange={(e) =>
                      setJumlahBhp((s) => ({ ...s, [r.bhp_id]: Number(e.target.value) }))
                    }
                    className="w-20 rounded-sm border border-sand-100 bg-white px-2 py-1.5 text-right text-sm"
                  />
                  <span className="text-xs text-ink/50">{r.satuan}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tarifDipilih && resepAktif.length === 0 && (
          <p className="text-xs text-ink/45">
            Tindakan ini belum punya resep BHP (atur di menu Tarif & Tindakan). Tetap bisa dicatat tanpa
            potong stok.
          </p>
        )}

        {state?.pesan && (
          <p
            role="alert"
            className={`rounded-sm px-3.5 py-2.5 text-sm ${
              state.sukses ? "bg-teal-500/10 text-teal-700" : "bg-clay-600/10 text-clay-700"
            }`}
          >
            {state.pesan}
          </p>
        )}

        {tarifDipilih && <TombolCatat />}
      </form>

      <div>
        <p className="mb-2 text-sm font-bold text-ink">Tindakan Tercatat Hari Ini</p>
        <div className="space-y-2">
          {tindakanTercatat.map((t) => (
            <div key={t.id} className="rounded-sm border border-sand-100 bg-white p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">{t.namaLayanan}</p>
                <button
                  onClick={() => batalkanTindakanAction(t.id, pasienId)}
                  className="text-xs font-medium text-clay-700 underline decoration-clay-700/30 underline-offset-2"
                >
                  Batalkan
                </button>
              </div>
              {t.items.length > 0 && (
                <p className="mt-1 text-xs text-ink/50">
                  BHP: {t.items.map((i) => `${i.namaBhp} ${i.jumlah}${i.satuan}`).join(", ")}
                </p>
              )}
            </div>
          ))}
          {tindakanTercatat.length === 0 && (
            <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/45">
              Belum ada tindakan tercatat hari ini.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
