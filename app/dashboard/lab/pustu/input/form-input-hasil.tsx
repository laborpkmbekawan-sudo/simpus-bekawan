"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { simpanLaporanPustuAction } from "../actions";
import { LABEL_FLAG, WARNA_FLAG, hitungFlag, teksRujukan, type ParameterLab } from "@/lib/lab";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3 py-2 text-sm";
const labelCls = "text-xs font-bold text-ink/70";

export type PemeriksaanPustu = {
  id: string;
  nama: string;
  kategori: string;
  parameter: ParameterLab[];
};

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!confirm("Kirim laporan ke Lab Induk? Setelah dikirim, hasil tidak bisa diubah (kecuali dikembalikan Lab).")) {
          e.preventDefault();
        }
      }}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Mengirim..." : "Kirim ke Lab Induk"}
    </button>
  );
}

export default function FormInputHasilPustu({
  daftar,
  hariIni,
}: {
  daftar: PemeriksaanPustu[];
  hariIni: string;
}) {
  const [state, aksi] = useFormState(simpanLaporanPustuAction, null);
  const [pemeriksaanId, setPemeriksaanId] = useState("");
  const [jk, setJk] = useState("");
  const [nilai, setNilai] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const dipilih = daftar.find((d) => d.id === pemeriksaanId) ?? null;

  useEffect(() => {
    if (state?.sukses) {
      formRef.current?.reset();
      setPemeriksaanId("");
      setJk("");
      setNilai({});
    }
  }, [state]);

  const kirim = (dipilih?.parameter ?? []).map((p) => ({ parameter_id: p.id, nilai: nilai[p.id] ?? "" }));

  return (
    <form ref={formRef} action={aksi} className="space-y-5">
      <input type="hidden" name="hasil" value={JSON.stringify(kirim)} />

      <section className="rounded-card border border-sand-100 bg-white p-5">
        <h2 className="mb-3 text-base font-bold text-ink">Identitas pasien (RM Pustu)</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 sm:col-span-2">
            <span className={labelCls}>Nama pasien</span>
            <input name="nama_pasien" required className={inputCls} />
          </label>
          <label className="space-y-1">
            <span className={labelCls}>No. RM Pustu</span>
            <input name="no_rm_pustu" className={inputCls} placeholder="Opsional" />
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Jenis kelamin</span>
            <select name="jenis_kelamin" required value={jk} onChange={(e) => setJk(e.target.value)} className={inputCls}>
              <option value="" disabled>
                Pilih
              </option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Tanggal lahir</span>
            <input type="date" name="tanggal_lahir" max={hariIni} className={inputCls} />
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Tanggal pemeriksaan</span>
            <input type="date" name="tanggal_periksa" defaultValue={hariIni} max={hariIni} required className={inputCls} />
          </label>
        </div>
      </section>

      <section className="rounded-card border border-sand-100 bg-white p-5">
        <h2 className="mb-3 text-base font-bold text-ink">Pemeriksaan &amp; hasil</h2>
        <label className="block space-y-1">
          <span className={labelCls}>Jenis pemeriksaan</span>
          <select
            name="pemeriksaan_id"
            required
            value={pemeriksaanId}
            onChange={(e) => {
              setPemeriksaanId(e.target.value);
              setNilai({});
            }}
            className={inputCls}
          >
            <option value="" disabled>
              Pilih pemeriksaan yang tersedia di Pustu
            </option>
            {daftar.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nama} · {d.kategori}
              </option>
            ))}
          </select>
        </label>

        {dipilih && (
          <div className="mt-4 space-y-3">
            {!jk && <p className="text-xs text-clay-700">Pilih jenis kelamin dulu supaya nilai rujukan dan penanda hasil sesuai.</p>}
            {dipilih.parameter.map((p) => {
              const v = nilai[p.id] ?? "";
              const flag = jk ? hitungFlag(p, jk, v) : null;
              const rujukan = jk ? teksRujukan(p, jk) : "";
              return (
                <div key={p.id} className="grid items-start gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
                  <div>
                    <p className="text-sm font-semibold text-ink">{p.nama}</p>
                    <p className="text-xs text-ink/45">
                      {rujukan ? `Rujukan: ${rujukan}` : "Tanpa nilai rujukan"}
                      {p.satuan ? ` ${p.satuan}` : ""}
                    </p>
                  </div>
                  {p.tipe === "pilihan" ? (
                    <select
                      value={v}
                      onChange={(e) => setNilai((s) => ({ ...s, [p.id]: e.target.value }))}
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
                      value={v}
                      onChange={(e) => setNilai((s) => ({ ...s, [p.id]: e.target.value }))}
                      inputMode={p.tipe === "angka" ? "decimal" : "text"}
                      className={inputCls}
                      placeholder={p.tipe === "angka" ? `Nilai${p.satuan ? ` (${p.satuan})` : ""}` : "Hasil"}
                      aria-label={`Hasil ${p.nama}`}
                    />
                  )}
                  <p className={`pt-2 text-sm ${flag ? WARNA_FLAG[flag] : "text-ink/30"}`}>{flag ? LABEL_FLAG[flag] : "—"}</p>
                </div>
              );
            })}
          </div>
        )}

        <label className="mt-4 block space-y-1">
          <span className={labelCls}>Catatan (opsional)</span>
          <input name="catatan" className={inputCls} placeholder="Mis. pasien puasa 8 jam" />
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Tombol />
        {state?.pesan && (
          <p role={state.sukses ? "status" : "alert"} className={`text-sm ${state.sukses ? "text-teal-700" : "text-clay-700"}`}>
            {state.pesan}
          </p>
        )}
      </div>
    </form>
  );
}
