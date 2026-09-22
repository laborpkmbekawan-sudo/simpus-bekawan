"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

export type Kolom = {
  key: string;
  label: string;
  tipe?: "text" | "number" | "select";
  opsi?: { value: string; label: string }[];
  lebarKecil?: boolean;
};

type Hasil = { pesan: string; sukses: boolean };
type Aksi = (sebelum: Hasil | null, formData: FormData) => Promise<Hasil>;

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-2.5 py-1.5 text-sm";

function TombolSimpan({ label = "Simpan" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "..." : label}
    </button>
  );
}

function Kolomnya({ k, nilai }: { k: Kolom; nilai: Record<string, unknown> }) {
  const defaultValue = (nilai[k.key] as string | number | undefined) ?? "";
  if (k.tipe === "select") {
    return (
      <select name={k.key} defaultValue={String(defaultValue)} className={inputCls}>
        {k.opsi?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      name={k.key}
      type={k.tipe === "number" ? "number" : "text"}
      defaultValue={defaultValue}
      className={inputCls}
    />
  );
}

function tampilNilai(k: Kolom, nilai: Record<string, unknown>): string {
  const v = nilai[k.key];
  if (k.tipe === "select") return k.opsi?.find((o) => o.value === v)?.label ?? String(v ?? "—");
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

function BarisForm({
  kolom,
  nilai,
  aksi,
  onSelesai,
  labelTombol,
}: {
  kolom: Kolom[];
  nilai: Record<string, unknown>;
  aksi: Aksi;
  onSelesai: () => void;
  labelTombol: string;
}) {
  const [state, formAction] = useFormState(aksi, null);

  useEffect(() => {
    if (state?.sukses) onSelesai();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-sm bg-sand-50 p-2.5">
      {nilai.id ? <input type="hidden" name="id" value={String(nilai.id)} /> : null}
      {kolom.map((k) => (
        <div key={k.key} className={k.lebarKecil ? "w-20" : "min-w-[110px] flex-1"}>
          <label className="mb-0.5 block text-[10px] text-ink/45">{k.label}</label>
          <Kolomnya k={k} nilai={nilai} />
        </div>
      ))}
      <div className="flex gap-1.5 pb-0.5">
        <TombolSimpan label={labelTombol} />
        <button
          type="button"
          onClick={onSelesai}
          className="rounded-sm border border-sand-100 px-3 py-1.5 text-xs font-semibold text-ink/60 hover:bg-white"
        >
          Batal
        </button>
      </div>
      {state?.pesan && !state.sukses && (
        <p role="alert" className="w-full text-xs text-clay-700">
          {state.pesan}
        </p>
      )}
    </form>
  );
}

export default function EditorTabel({
  judul,
  keterangan,
  kolom,
  data,
  aksi,
  kolomTambahan,
}: {
  judul: string;
  keterangan?: string;
  kolom: Kolom[];
  data: Record<string, unknown>[];
  aksi: Aksi;
  kolomTambahan?: Record<string, unknown>;
}) {
  const [idDiedit, setIdDiedit] = useState<string | null>(null);
  const [tambahTerbuka, setTambahTerbuka] = useState(false);

  return (
    <div className="rounded-card border border-sand-100 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">{judul}</h2>
          {keterangan && <p className="text-xs text-ink/45">{keterangan}</p>}
        </div>
        {!tambahTerbuka && (
          <button
            type="button"
            onClick={() => setTambahTerbuka(true)}
            className="rounded-sm bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-900"
          >
            + Tambah
          </button>
        )}
      </div>

      <div className="space-y-2">
        {tambahTerbuka && (
          <BarisForm
            kolom={kolom}
            nilai={kolomTambahan ?? {}}
            aksi={aksi}
            onSelesai={() => setTambahTerbuka(false)}
            labelTombol="Tambah"
          />
        )}

        {data.map((baris) => {
          const id = String(baris.id);
          if (idDiedit === id) {
            return (
              <BarisForm
                key={id}
                kolom={kolom}
                nilai={baris}
                aksi={aksi}
                onSelesai={() => setIdDiedit(null)}
                labelTombol="Simpan"
              />
            );
          }
          return (
            <div
              key={id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-sand-100 py-2 text-sm last:border-0"
            >
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                {kolom.map((k) => (
                  <span key={k.key}>
                    <span className="text-ink/40">{k.label}: </span>
                    <span className="font-medium text-ink">{tampilNilai(k, baris)}</span>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIdDiedit(id)}
                className="text-xs font-semibold text-teal-700 hover:underline"
              >
                Ubah
              </button>
            </div>
          );
        })}
        {data.length === 0 && !tambahTerbuka && <p className="py-3 text-sm text-ink/45">Belum ada data.</p>}
      </div>
    </div>
  );
}
