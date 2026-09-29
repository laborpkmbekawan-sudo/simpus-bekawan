"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { buatResepManualAction } from "../actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3 py-2 text-sm";
const labelCls = "text-xs font-bold text-ink/70";

type Obat = { id: string; nama_obat: string; satuan: string; stok_saat_ini: number };
type Kunjungan = { id: string; label: string };

type BarisObat = {
  idBaris: string;
  obat_id: string;
  dosis: string;
  frekuensi_per_hari: string;
  waktu_pemberian: string;
  durasi_hari: string;
  jumlah: string;
  catatan: string;
};

type BarisKomposisi = { idBaris: string; obat_id: string; jumlah_total: string };

type BarisRacikan = {
  idBaris: string;
  nama_racikan: string;
  jumlah_bungkus: string;
  waktu_pemberian: string;
  durasi_hari: string;
  catatan: string;
  komposisi: BarisKomposisi[];
};

function komposisiKosong(): BarisKomposisi {
  return { idBaris: crypto.randomUUID(), obat_id: "", jumlah_total: "" };
}

function racikanKosong(): BarisRacikan {
  return {
    idBaris: crypto.randomUUID(),
    nama_racikan: "",
    jumlah_bungkus: "",
    waktu_pemberian: "",
    durasi_hari: "",
    catatan: "",
    komposisi: [komposisiKosong()],
  };
}

function barisKosong(): BarisObat {
  return {
    idBaris: crypto.randomUUID(),
    obat_id: "",
    dosis: "",
    frekuensi_per_hari: "",
    waktu_pemberian: "",
    durasi_hari: "",
    jumlah: "",
    catatan: "",
  };
}

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Resep"}
    </button>
  );
}

export default function FormEntriResep({
  daftarKunjungan,
  daftarObat,
}: {
  daftarKunjungan: Kunjungan[];
  daftarObat: Obat[];
}) {
  const [state, formAction] = useFormState(buatResepManualAction, null);
  const [baris, setBaris] = useState<BarisObat[]>([barisKosong()]);
  const [racikan, setRacikan] = useState<BarisRacikan[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) {
      formRef.current?.reset();
      setBaris([barisKosong()]);
      setRacikan([]);
    }
  }, [state]);

  function ubah(idBaris: string, perubahan: Partial<BarisObat>) {
    setBaris((sebelum) => sebelum.map((b) => (b.idBaris === idBaris ? { ...b, ...perubahan } : b)));
  }

  function hapusBaris(idBaris: string) {
    setBaris((sebelum) => (sebelum.length > 1 ? sebelum.filter((b) => b.idBaris !== idBaris) : sebelum));
  }

  function ubahRacikan(idBaris: string, perubahan: Partial<BarisRacikan>) {
    setRacikan((sebelum) => sebelum.map((r) => (r.idBaris === idBaris ? { ...r, ...perubahan } : r)));
  }

  function hapusRacikan(idBaris: string) {
    setRacikan((sebelum) => sebelum.filter((r) => r.idBaris !== idBaris));
  }

  function ubahKomposisi(idRacikan: string, idBarisKomposisi: string, perubahan: Partial<BarisKomposisi>) {
    setRacikan((sebelum) =>
      sebelum.map((r) =>
        r.idBaris !== idRacikan
          ? r
          : { ...r, komposisi: r.komposisi.map((k) => (k.idBaris === idBarisKomposisi ? { ...k, ...perubahan } : k)) }
      )
    );
  }

  function hapusKomposisi(idRacikan: string, idBarisKomposisi: string) {
    setRacikan((sebelum) =>
      sebelum.map((r) =>
        r.idBaris !== idRacikan || r.komposisi.length <= 1
          ? r
          : { ...r, komposisi: r.komposisi.filter((k) => k.idBaris !== idBarisKomposisi) }
      )
    );
  }

  // Jumlah otomatis kesaranin dari frekuensi x durasi (biar farmasi gak
  // salah itung), tapi tetep bisa diedit manual kalau beda (mis. sirup).
  function frekuensiDurasiBerubah(idBaris: string, frekuensi: string, durasi: string) {
    const f = Number(frekuensi);
    const d = Number(durasi);
    setBaris((sebelum) =>
      sebelum.map((b) => {
        if (b.idBaris !== idBaris) return b;
        const saran = f > 0 && d > 0 ? String(f * d) : b.jumlah;
        return { ...b, frekuensi_per_hari: frekuensi, durasi_hari: durasi, jumlah: saran };
      })
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <input type="hidden" name="items" value={JSON.stringify(baris)} />
      <input type="hidden" name="racikan" value={JSON.stringify(racikan)} />

      <div className="rounded-card border border-sand-100 bg-white p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="kunjungan_id" className="text-sm font-bold text-ink/80">
              Pasien / kunjungan hari ini
            </label>
            <select id="kunjungan_id" name="kunjungan_id" required className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm" defaultValue="">
              <option value="" disabled>
                Pilih kunjungan...
              </option>
              {daftarKunjungan.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
            {daftarKunjungan.length === 0 && (
              <p className="text-xs text-ink/45">Belum ada kunjungan hari ini.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="catatan" className="text-sm font-bold text-ink/80">
              Catatan resep (opsional)
            </label>
            <input id="catatan" name="catatan" className="w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {baris.map((b, i) => (
          <div key={b.idBaris} className="rounded-card border border-sand-100 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-ink/40">Obat {i + 1}</p>
              <button type="button" onClick={() => hapusBaris(b.idBaris)} className="text-xs text-clay-700 underline">
                Hapus
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
              <div className="col-span-2 space-y-1">
                <label className={labelCls}>Nama obat</label>
                <select
                  value={b.obat_id}
                  onChange={(e) => ubah(b.idBaris, { obat_id: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Pilih obat...</option>
                  {daftarObat.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nama_obat} (sisa {o.stok_saat_ini} {o.satuan})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Dosis</label>
                <input
                  value={b.dosis}
                  onChange={(e) => ubah(b.idBaris, { dosis: e.target.value })}
                  placeholder="mis. 500mg"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Frekuensi/hari</label>
                <input
                  type="number"
                  min={0}
                  value={b.frekuensi_per_hari}
                  onChange={(e) => frekuensiDurasiBerubah(b.idBaris, e.target.value, b.durasi_hari)}
                  placeholder="mis. 3"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Waktu pemberian</label>
                <select
                  value={b.waktu_pemberian}
                  onChange={(e) => ubah(b.idBaris, { waktu_pemberian: e.target.value })}
                  className={inputCls}
                >
                  <option value="">—</option>
                  <option value="Sebelum makan">Sebelum makan</option>
                  <option value="Sesudah makan">Sesudah makan</option>
                  <option value="Kapan saja">Kapan saja</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Durasi (hari)</label>
                <input
                  type="number"
                  min={0}
                  value={b.durasi_hari}
                  onChange={(e) => frekuensiDurasiBerubah(b.idBaris, b.frekuensi_per_hari, e.target.value)}
                  placeholder="mis. 5"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Jumlah diserahkan</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={b.jumlah}
                  onChange={(e) => ubah(b.idBaris, { jumlah: e.target.value })}
                  placeholder="otomatis / manual"
                  className={inputCls}
                />
              </div>
              <div className="col-span-2 space-y-1 sm:col-span-6">
                <label className={labelCls}>Catatan aturan pakai (opsional)</label>
                <input
                  value={b.catatan}
                  onChange={(e) => ubah(b.idBaris, { catatan: e.target.value })}
                  placeholder="mis. dihabiskan, jangan digerus"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setBaris((sebelum) => [...sebelum, barisKosong()])}
          className="text-sm font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
        >
          + Tambah obat
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-ink/40">
          Racikan (puyer/campuran, opsional)
        </p>
        {racikan.map((r, i) => (
          <div key={r.idBaris} className="rounded-card border border-teal-700/20 bg-teal-700/5 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Racikan {i + 1}</p>
              <button type="button" onClick={() => hapusRacikan(r.idBaris)} className="text-xs text-clay-700 underline">
                Hapus racikan
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="col-span-2 space-y-1">
                <label className={labelCls}>Nama racikan</label>
                <input
                  value={r.nama_racikan}
                  onChange={(e) => ubahRacikan(r.idBaris, { nama_racikan: e.target.value })}
                  placeholder="mis. Puyer Batuk Pilek"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Jumlah bungkus</label>
                <input
                  type="number"
                  min={0}
                  value={r.jumlah_bungkus}
                  onChange={(e) => ubahRacikan(r.idBaris, { jumlah_bungkus: e.target.value })}
                  placeholder="mis. 10"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Waktu pemberian</label>
                <select
                  value={r.waktu_pemberian}
                  onChange={(e) => ubahRacikan(r.idBaris, { waktu_pemberian: e.target.value })}
                  className={inputCls}
                >
                  <option value="">—</option>
                  <option value="Sebelum makan">Sebelum makan</option>
                  <option value="Sesudah makan">Sesudah makan</option>
                  <option value="Kapan saja">Kapan saja</option>
                </select>
              </div>
              <div className="col-span-2 sm:col-span-4 space-y-1">
                <label className={labelCls}>Durasi (hari)</label>
                <input
                  type="number"
                  min={0}
                  value={r.durasi_hari}
                  onChange={(e) => ubahRacikan(r.idBaris, { durasi_hari: e.target.value })}
                  placeholder="mis. 5"
                  className={`${inputCls} max-w-[140px]`}
                />
              </div>
            </div>

            <div className="mt-3 space-y-2 border-t border-teal-700/15 pt-3">
              <p className={labelCls}>Komposisi obat dasar (jumlah total buat semua bungkus)</p>
              {r.komposisi.map((k) => (
                <div key={k.idBaris} className="flex items-center gap-2">
                  <select
                    value={k.obat_id}
                    onChange={(e) => ubahKomposisi(r.idBaris, k.idBaris, { obat_id: e.target.value })}
                    className={`${inputCls} flex-1`}
                  >
                    <option value="">Pilih obat...</option>
                    {daftarObat.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.nama_obat} (sisa {o.stok_saat_ini} {o.satuan})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={k.jumlah_total}
                    onChange={(e) => ubahKomposisi(r.idBaris, k.idBaris, { jumlah_total: e.target.value })}
                    placeholder="Jumlah"
                    className={`${inputCls} w-28`}
                  />
                  <button
                    type="button"
                    onClick={() => hapusKomposisi(r.idBaris, k.idBaris)}
                    className="text-xs text-clay-700 underline"
                  >
                    Hapus
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => ubahRacikan(r.idBaris, { komposisi: [...r.komposisi, komposisiKosong()] })}
                className="text-xs font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
              >
                + Tambah komposisi
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRacikan((sebelum) => [...sebelum, racikanKosong()])}
          className="text-sm font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
        >
          + Tambah racikan
        </button>
      </div>

      <div className="flex items-center gap-3">
        <TombolSimpan />
        {state?.pesan && (
          <p role="alert" className={`text-sm ${state.sukses ? "text-teal-700" : "text-clay-700"}`}>
            {state.pesan}
          </p>
        )}
      </div>
    </form>
  );
}
