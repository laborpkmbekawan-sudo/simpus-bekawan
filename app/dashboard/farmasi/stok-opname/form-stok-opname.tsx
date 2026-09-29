"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { simpanStokOpnameAction } from "./actions";

type Obat = { id: string; nama_obat: string; satuan: string; stok_saat_ini: number };

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Stok Opname"}
    </button>
  );
}

export default function FormStokOpname({ daftarObat }: { daftarObat: Obat[] }) {
  const [state, formAction] = useFormState(simpanStokOpnameAction, null);
  const [fisik, setFisik] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) {
      formRef.current?.reset();
      setFisik({});
    }
  }, [state]);

  const items = daftarObat.map((o) => ({
    obat_id: o.id,
    stok_sistem: String(o.stok_saat_ini),
    stok_fisik: fisik[o.id] ?? "",
  }));

  const adaSelisih = items.some((it) => it.stok_fisik !== "" && Number(it.stok_fisik) !== Number(it.stok_sistem));

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <div className="overflow-hidden rounded-card border border-sand-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
              <th className="px-5 py-3 font-medium">Nama Obat</th>
              <th className="px-5 py-3 font-medium">Stok Sistem</th>
              <th className="px-5 py-3 font-medium">Stok Fisik</th>
              <th className="px-5 py-3 font-medium">Selisih</th>
            </tr>
          </thead>
          <tbody>
            {daftarObat.map((o) => {
              const nilai = fisik[o.id] ?? "";
              const selisih = nilai === "" ? null : Number(nilai) - Number(o.stok_saat_ini);
              return (
                <tr key={o.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-5 py-2.5 text-ink">{o.nama_obat}</td>
                  <td className="px-5 py-2.5 text-ink/60">
                    {o.stok_saat_ini} {o.satuan}
                  </td>
                  <td className="px-5 py-2.5">
                    <input
                      type="number"
                      step="0.1"
                      value={nilai}
                      onChange={(e) => setFisik((s) => ({ ...s, [o.id]: e.target.value }))}
                      placeholder={`${o.stok_saat_ini}`}
                      className="w-28 rounded-sm border border-sand-100 bg-[#FBFDFF] px-2.5 py-1.5 text-sm"
                    />
                  </td>
                  <td className="px-5 py-2.5">
                    {selisih === null ? (
                      <span className="text-ink/30">—</span>
                    ) : selisih === 0 ? (
                      <span className="text-ink/50">Sama</span>
                    ) : (
                      <span className={selisih > 0 ? "font-medium text-teal-700" : "font-medium text-clay-700"}>
                        {selisih > 0 ? "+" : ""}
                        {selisih}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          name="catatan"
          placeholder="Catatan sesi opname (opsional, mis. Opname Bulanan September)"
          className="w-full max-w-sm rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
        />
        <TombolSimpan />
        {adaSelisih && (
          <span className="text-xs text-clay-700">
            Ada obat yang selisih -- stok sistem bakal otomatis disamain ke stok fisik pas disimpan.
          </span>
        )}
        {state?.pesan && (
          <p role="alert" className={`w-full text-sm ${state.sukses ? "text-teal-700" : "text-clay-700"}`}>
            {state.pesan}
          </p>
        )}
      </div>
    </form>
  );
}
