"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { simpanHasilLabAction } from "../actions";
import { LABEL_FLAG, WARNA_FLAG, hitungFlag, teksRujukan, type ParameterLab } from "@/lib/lab";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3 py-2 text-sm";

export type ItemForm = {
  id: string;
  nama: string;
  parameter: ParameterLab[];
  tersimpan: Record<string, { nilai: string; catatan: string }>;
};

function Tombol({ mode, label, utama }: { mode: "draft" | "validasi"; label: string; utama?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="mode"
      value={mode}
      disabled={pending}
      onClick={(e) => {
        if (mode === "validasi" && !confirm("Validasi dan kirim hasil ke klaster? Setelah ini hasil tidak bisa diubah.")) {
          e.preventDefault();
        }
      }}
      className={`rounded-sm px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
        utama ? "bg-teal-700 text-white hover:bg-teal-900" : "border border-sand-100 text-ink/70 hover:bg-sand-50"
      }`}
    >
      {pending ? "Memproses..." : label}
    </button>
  );
}

export default function FormHasilLab({
  permintaanId,
  jenisKelamin,
  items,
}: {
  permintaanId: string;
  jenisKelamin: string | null;
  items: ItemForm[];
}) {
  const [state, aksi] = useFormState(simpanHasilLabAction, null);
  const [nilai, setNilai] = useState<Record<string, { nilai: string; catatan: string }>>(() => {
    const awal: Record<string, { nilai: string; catatan: string }> = {};
    for (const it of items) {
      for (const p of it.parameter) {
        const t = it.tersimpan[p.id];
        awal[`${it.id}:${p.id}`] = { nilai: t?.nilai ?? "", catatan: t?.catatan ?? "" };
      }
    }
    return awal;
  });

  function ubah(kunci: string, bagian: Partial<{ nilai: string; catatan: string }>) {
    setNilai((s) => ({ ...s, [kunci]: { ...s[kunci], ...bagian } }));
  }

  const kirim = items.flatMap((it) =>
    it.parameter.map((p) => ({
      item_id: it.id,
      parameter_id: p.id,
      nilai: nilai[`${it.id}:${p.id}`]?.nilai ?? "",
      catatan: nilai[`${it.id}:${p.id}`]?.catatan ?? "",
    }))
  );

  return (
    <form action={aksi} className="space-y-5">
      <input type="hidden" name="permintaan_id" value={permintaanId} />
      <input type="hidden" name="hasil" value={JSON.stringify(kirim)} />

      {items.map((it) => (
        <section key={it.id} className="rounded-card border border-sand-100 bg-white p-5">
          <h2 className="mb-3 text-base font-bold text-ink">{it.nama}</h2>
          <div className="space-y-3">
            {it.parameter.map((p) => {
              const kunci = `${it.id}:${p.id}`;
              const v = nilai[kunci] ?? { nilai: "", catatan: "" };
              const flag = hitungFlag(p, jenisKelamin, v.nilai);
              const rujukan = teksRujukan(p, jenisKelamin);
              return (
                <div key={p.id} className="grid items-start gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
                  <div>
                    <p className="text-sm font-semibold text-ink">{p.nama}</p>
                    <p className="text-xs text-ink/45">
                      {rujukan ? `Rujukan: ${rujukan}` : "Tanpa nilai rujukan"}
                      {p.satuan ? ` ${p.satuan}` : ""}
                    </p>
                  </div>

                  {p.tipe === "pilihan" ? (
                    <select
                      value={v.nilai}
                      onChange={(e) => ubah(kunci, { nilai: e.target.value })}
                      className={inputCls}
                      aria-label={`Hasil ${p.nama}`}
                    >
                      <option value="">— pilih —</option>
                      {(p.pilihan ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={v.nilai}
                      onChange={(e) => ubah(kunci, { nilai: e.target.value })}
                      inputMode={p.tipe === "angka" ? "decimal" : "text"}
                      className={inputCls}
                      placeholder={p.tipe === "angka" ? `Nilai${p.satuan ? ` (${p.satuan})` : ""}` : "Hasil"}
                      aria-label={`Hasil ${p.nama}`}
                    />
                  )}

                  <div className="flex h-[38px] items-center text-xs">
                    {flag ? <span className={WARNA_FLAG[flag]}>{LABEL_FLAG[flag]}</span> : <span className="text-ink/30">—</span>}
                  </div>

                  <input
                    value={v.catatan}
                    onChange={(e) => ubah(kunci, { catatan: e.target.value })}
                    className={inputCls}
                    placeholder="Catatan (opsional)"
                    aria-label={`Catatan ${p.nama}`}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section className="rounded-card border border-sand-100 bg-white p-5">
        <label className="space-y-1.5">
          <span className="text-xs font-bold text-ink/70">Catatan validasi (opsional, tampil di cetakan)</span>
          <textarea name="catatan_validasi" rows={2} className={inputCls} placeholder="mis. Sampel lipemik, hasil sudah diulang" />
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Tombol mode="draft" label="Simpan draft" />
        <Tombol mode="validasi" label="Validasi & kirim ke klaster" utama />
        {state?.pesan && (
          <p role="status" className={`text-sm ${state.sukses ? "text-teal-700" : "text-clay-700"}`}>
            {state.pesan}
          </p>
        )}
      </div>
    </form>
  );
}
