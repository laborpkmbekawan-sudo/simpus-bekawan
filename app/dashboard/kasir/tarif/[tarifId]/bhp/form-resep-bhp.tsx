"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { hapusResepBhpAction, tambahResepBhpAction } from "./actions";

type Bhp = { id: string; nama_bhp: string; satuan: string };
type Resep = { id: string; jumlah_default: number; bhp: { nama_bhp: string; satuan: string } | null };

function TombolTambah() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Tambah ke Resep"}
    </button>
  );
}

export default function FormResepBhp({
  tarifLayananId,
  daftarBhp,
  daftarResep,
}: {
  tarifLayananId: string;
  daftarBhp: Bhp[];
  daftarResep: Resep[];
}) {
  const [state, formAction] = useFormState(tambahResepBhpAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && state.pesan === "") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="space-y-4">
      <form
        ref={formRef}
        action={formAction}
        className="flex flex-wrap items-end gap-3 rounded-card border border-sand-100 bg-white p-5"
      >
        <input type="hidden" name="tarif_layanan_id" value={tarifLayananId} />
        <div className="min-w-[220px] flex-1 space-y-1.5">
          <label htmlFor="bhp_id" className="text-sm font-bold text-ink/80">
            BHP
          </label>
          <select
            id="bhp_id"
            name="bhp_id"
            required
            defaultValue=""
            className="w-full rounded-sm border border-sand-100 bg-white px-3 py-2.5 text-sm"
          >
            <option value="" disabled>
              Pilih BHP
            </option>
            {daftarBhp.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nama_bhp} ({b.satuan})
              </option>
            ))}
          </select>
        </div>
        <div className="w-36 space-y-1.5">
          <label htmlFor="jumlah_default" className="text-sm font-bold text-ink/80">
            Jumlah default
          </label>
          <input
            id="jumlah_default"
            name="jumlah_default"
            type="number"
            step="0.1"
            defaultValue={1}
            className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
          />
        </div>
        <TombolTambah />
        {state?.pesan && (
          <p role="alert" className="w-full rounded-sm bg-clay-600/10 px-3.5 py-2.5 text-sm text-clay-700">
            {state.pesan}
          </p>
        )}
      </form>

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-5 py-3 font-medium">BHP</th>
              <th className="px-5 py-3 font-medium">Jumlah Default</th>
              <th className="px-5 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {daftarResep.map((r) => (
              <tr key={r.id} className="border-b border-sand-100/70 last:border-0">
                <td className="px-5 py-3.5 text-ink">{r.bhp?.nama_bhp ?? "—"}</td>
                <td className="px-5 py-3.5 text-ink/70">
                  {r.jumlah_default} {r.bhp?.satuan}
                </td>
                <td className="px-5 py-3.5">
                  <button
                    onClick={() => hapusResepBhpAction(r.id, tarifLayananId)}
                    className="text-xs font-medium text-clay-700 underline decoration-clay-700/30 underline-offset-2"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
            {daftarResep.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-sm text-ink/45">
                  Belum ada resep BHP buat tindakan ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
