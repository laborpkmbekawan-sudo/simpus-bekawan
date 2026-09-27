"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { batalkanResepObatKlinisAction, hapusItemResepObatAction, tambahResepObatAction } from "./actions";

type Obat = { id: string; namaObat: string; satuan: string };
type ItemResep = { id: string; namaObat: string; satuan: string; jumlah: number; aturanPakai: string | null };
type ResepObat = { id: string; status: string; dicatatPada: string; items: ItemResep[] };

const LABEL_STATUS: Record<string, string> = {
  menunggu: "Menunggu Farmasi",
  diverifikasi: "Diverifikasi Farmasi",
  diserahkan: "Sudah Diserahkan",
  dibatalkan: "Dibatalkan",
};

const WARNA_STATUS: Record<string, string> = {
  menunggu: "bg-clay-600/10 text-clay-700",
  diverifikasi: "bg-blue-500/10 text-blue-700",
  diserahkan: "bg-teal-700/10 text-teal-700",
  dibatalkan: "bg-ink/10 text-ink/50",
};

function TombolTambah() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menambah..." : "Tambah ke Resep"}
    </button>
  );
}

export default function FormResepObat({
  kunjunganId,
  daftarObat,
  daftarResep,
}: {
  kunjunganId: string;
  daftarObat: Obat[];
  daftarResep: ResepObat[];
}) {
  const [state, formAction] = useFormState(tambahResepObatAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-5">
      <form
        ref={formRef}
        action={formAction}
        className="flex flex-wrap items-end gap-3 rounded-sm border border-sand-100 bg-sand-50 p-4"
      >
        <input type="hidden" name="kunjungan_id" value={kunjunganId} />
        <div className="min-w-[180px] flex-1 space-y-1.5">
          <label htmlFor="obat_id" className="text-sm font-bold text-ink/80">
            Obat
          </label>
          <select
            id="obat_id"
            name="obat_id"
            required
            defaultValue=""
            className="w-full rounded-sm border border-sand-100 bg-white px-3 py-2.5 text-sm"
          >
            <option value="" disabled>
              Pilih obat...
            </option>
            {daftarObat.map((o) => (
              <option key={o.id} value={o.id}>
                {o.namaObat}
              </option>
            ))}
          </select>
        </div>
        <div className="w-28 space-y-1.5">
          <label htmlFor="jumlah" className="text-sm font-bold text-ink/80">
            Jumlah
          </label>
          <input
            id="jumlah"
            name="jumlah"
            type="number"
            step="0.1"
            min="0"
            required
            className="w-full rounded-sm border border-sand-100 bg-white px-3 py-2.5 text-sm"
          />
        </div>
        <div className="min-w-[200px] flex-1 space-y-1.5">
          <label htmlFor="aturan_pakai" className="text-sm font-bold text-ink/80">
            Aturan Pakai
          </label>
          <input
            id="aturan_pakai"
            name="aturan_pakai"
            placeholder="contoh: 3x1 sesudah makan"
            className="w-full rounded-sm border border-sand-100 bg-white px-3 py-2.5 text-sm"
          />
        </div>
        <TombolTambah />
        {state?.pesan && (
          <p
            role="alert"
            className={`w-full rounded-sm px-3.5 py-2.5 text-sm ${
              state.sukses ? "bg-teal-500/10 text-teal-700" : "bg-clay-600/10 text-clay-700"
            }`}
          >
            {state.pesan}
          </p>
        )}
      </form>

      <div className="space-y-3">
        {daftarResep.map((r) => (
          <div key={r.id} className="rounded-sm border border-sand-100 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`rounded-sm px-2 py-1 text-xs font-semibold ${WARNA_STATUS[r.status] ?? ""}`}>
                {LABEL_STATUS[r.status] ?? r.status}
              </span>
              {r.status === "menunggu" && (
                <button
                  onClick={() => batalkanResepObatKlinisAction(r.id, kunjunganId)}
                  className="text-xs font-medium text-clay-700 underline decoration-clay-700/30 underline-offset-2"
                >
                  Batalkan Resep
                </button>
              )}
            </div>
            <div className="mt-2 space-y-1.5">
              {r.items.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink">
                    {i.namaObat} — {i.jumlah} {i.satuan}
                    {i.aturanPakai ? <span className="text-ink/50"> · {i.aturanPakai}</span> : null}
                  </span>
                  {r.status === "menunggu" && (
                    <button
                      onClick={() => hapusItemResepObatAction(i.id, kunjunganId)}
                      className="text-xs text-clay-700 underline decoration-clay-700/30 underline-offset-2"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              ))}
              {r.items.length === 0 && <p className="text-xs text-ink/45">Belum ada item obat.</p>}
            </div>
          </div>
        ))}
        {daftarResep.length === 0 && (
          <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/45">Belum ada resep obat.</p>
        )}
      </div>
    </div>
  );
}
