"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { simpanPemeriksaanAction } from "../actions";
import { KATEGORI_LAB } from "@/lib/lab";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3 py-2 text-sm";
const labelCls = "text-xs font-bold text-ink/70";

type BarisParameter = {
  idBaris: string;
  nama: string;
  satuan: string;
  tipe: "angka" | "pilihan" | "teks";
  pilihan: string;
  pilihan_normal: string;
  min_l: string;
  max_l: string;
  min_p: string;
  max_p: string;
};

function parameterKosong(): BarisParameter {
  return {
    idBaris: crypto.randomUUID(),
    nama: "",
    satuan: "",
    tipe: "angka",
    pilihan: "",
    pilihan_normal: "",
    min_l: "",
    max_l: "",
    min_p: "",
    max_p: "",
  };
}

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan pemeriksaan"}
    </button>
  );
}

export type OpsiTarif = { id: string; nama_layanan: string; harga: number };

export default function FormTambahPemeriksaan({ daftarTarif = [] }: { daftarTarif?: OpsiTarif[] }) {
  const [state, aksi] = useFormState(simpanPemeriksaanAction, null);
  const [terbuka, setTerbuka] = useState(false);
  const [parameter, setParameter] = useState<BarisParameter[]>([parameterKosong()]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) {
      formRef.current?.reset();
      setParameter([parameterKosong()]);
    }
  }, [state]);

  function ubah(idBaris: string, bagian: Partial<BarisParameter>) {
    setParameter((p) => p.map((b) => (b.idBaris === idBaris ? { ...b, ...bagian } : b)));
  }

  if (!terbuka) {
    return (
      <button
        type="button"
        onClick={() => setTerbuka(true)}
        className="rounded-sm bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900"
      >
        + Tambah Pemeriksaan
      </button>
    );
  }

  return (
    <form ref={formRef} action={aksi} className="space-y-5 rounded-card border border-sand-100 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-ink">Pemeriksaan / Paket Baru</h2>
        <button type="button" onClick={() => setTerbuka(false)} className="text-xs font-semibold text-ink/50 hover:text-ink">
          Tutup
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1.5 sm:col-span-2">
          <span className={labelCls}>Nama pemeriksaan / paket *</span>
          <input name="nama" required className={inputCls} placeholder="mis. Profil Lipid" />
        </label>
        <label className="space-y-1.5">
          <span className={labelCls}>Kode</span>
          <input name="kode" className={`${inputCls} uppercase`} placeholder="mis. LIPID" />
        </label>
        <label className="space-y-1.5">
          <span className={labelCls}>Kategori</span>
          <select name="kategori" className={inputCls} defaultValue="Kimia Klinik">
            {KATEGORI_LAB.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 sm:col-span-2">
          <span className={labelCls}>Jenis sampel</span>
          <input name="jenis_sampel" className={inputCls} placeholder="mis. Serum, Urine sewaktu, Darah EDTA" />
        </label>
        <label className="space-y-1.5 sm:col-span-2">
          <span className={labelCls}>Tarif kasir (opsional)</span>
          <select name="tarif_layanan_id" className={inputCls} defaultValue="">
            <option value="">Tidak ditagih</option>
            {daftarTarif.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nama_layanan} — Rp {Math.round(Number(t.harga)).toLocaleString("id-ID")}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-3">
        <p className={labelCls}>Parameter hasil *</p>
        {parameter.map((b, i) => (
          <div key={b.idBaris} className="space-y-3 rounded-sm border border-sand-100 bg-sand-50 p-3.5">
            <div className="grid gap-3 sm:grid-cols-[1fr_140px_130px_auto]">
              <input
                value={b.nama}
                onChange={(e) => ubah(b.idBaris, { nama: e.target.value })}
                className={inputCls}
                placeholder={`Nama parameter ${i + 1}`}
                aria-label={`Nama parameter ${i + 1}`}
              />
              <input
                value={b.satuan}
                onChange={(e) => ubah(b.idBaris, { satuan: e.target.value })}
                className={inputCls}
                placeholder="Satuan"
                aria-label="Satuan"
              />
              <select
                value={b.tipe}
                onChange={(e) => ubah(b.idBaris, { tipe: e.target.value as BarisParameter["tipe"] })}
                className={inputCls}
                aria-label="Tipe hasil"
              >
                <option value="angka">Angka</option>
                <option value="pilihan">Pilihan</option>
                <option value="teks">Teks bebas</option>
              </select>
              <button
                type="button"
                disabled={parameter.length === 1}
                onClick={() => setParameter((p) => p.filter((x) => x.idBaris !== b.idBaris))}
                className="rounded-sm px-3 text-xs font-semibold text-clay-700 hover:bg-clay-600/10 disabled:opacity-30"
              >
                Hapus
              </button>
            </div>

            {b.tipe === "angka" && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="space-y-1">
                  <span className="text-[11px] text-ink/50">Min (umum/laki-laki)</span>
                  <input value={b.min_l} onChange={(e) => ubah(b.idBaris, { min_l: e.target.value })} inputMode="decimal" className={inputCls} />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-ink/50">Maks (umum/laki-laki)</span>
                  <input value={b.max_l} onChange={(e) => ubah(b.idBaris, { max_l: e.target.value })} inputMode="decimal" className={inputCls} />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-ink/50">Min perempuan</span>
                  <input value={b.min_p} onChange={(e) => ubah(b.idBaris, { min_p: e.target.value })} inputMode="decimal" className={inputCls} placeholder="kosong = sama" />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-ink/50">Maks perempuan</span>
                  <input value={b.max_p} onChange={(e) => ubah(b.idBaris, { max_p: e.target.value })} inputMode="decimal" className={inputCls} placeholder="kosong = sama" />
                </label>
              </div>
            )}

            {b.tipe === "pilihan" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[11px] text-ink/50">Daftar pilihan (pisah koma)</span>
                  <input
                    value={b.pilihan}
                    onChange={(e) => ubah(b.idBaris, { pilihan: e.target.value })}
                    className={inputCls}
                    placeholder="Negatif, Positif"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-ink/50">Pilihan yang dianggap normal (opsional)</span>
                  <input
                    value={b.pilihan_normal}
                    onChange={(e) => ubah(b.idBaris, { pilihan_normal: e.target.value })}
                    className={inputCls}
                    placeholder="Negatif"
                  />
                </label>
              </div>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setParameter((p) => [...p, parameterKosong()])}
          className="rounded-sm border border-dashed border-teal-700/40 px-3.5 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-700/5"
        >
          + Tambah parameter
        </button>
      </div>

      <input
        type="hidden"
        name="parameter"
        value={JSON.stringify(parameter.map(({ idBaris: _id, ...sisa }) => sisa))}
      />

      <div className="flex flex-wrap items-center gap-3">
        <TombolSimpan />
        {state?.pesan && (
          <p role="status" className={`text-sm ${state.sukses ? "text-teal-700" : "text-clay-700"}`}>
            {state.pesan}
          </p>
        )}
      </div>
    </form>
  );
}
