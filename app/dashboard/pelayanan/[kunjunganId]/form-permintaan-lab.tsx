"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { batalkanPermintaanLabAction, buatPermintaanLabAction } from "../../lab/actions";
import { PelacakLab, PilPrioritasLab, PilStatusLab, TabelHasilLab, type ItemHasil } from "../../lab/komponen";
import TandaiDilihatLab from "../../lab/hasil/tandai-dilihat";
import { KATEGORI_LAB } from "@/lib/lab";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3 py-2 text-sm";
const labelCls = "text-xs font-bold text-ink/70";

export type KatalogLabRingkas = {
  id: string;
  kode: string | null;
  nama: string;
  kategori: string;
  jenis_sampel: string | null;
};

export type PermintaanLabTercatat = {
  id: string;
  no_lab: string;
  status: string;
  prioritas: string;
  diminta_pada: string;
  diminta_oleh: string | null;
  hasil_dilihat_pada: string | null;
  items: { id: string; dibatalkan: boolean; pemeriksaan: { nama: string } | null; hasil: ItemHasil["hasil"] }[];
};

function TombolKirim() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Mengirim..." : "Kirim ke Laboratorium"}
    </button>
  );
}

function TombolKecilBatal() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm border border-clay-600/30 px-3 py-1.5 text-xs font-semibold text-clay-700 hover:bg-clay-600/10 disabled:opacity-60"
    >
      {pending ? "..." : "Batalkan"}
    </button>
  );
}

function TombolBatal({ id }: { id: string }) {
  const [state, aksi] = useFormState(batalkanPermintaanLabAction, null);
  return (
    <form
      action={aksi}
      onSubmit={(e) => {
        if (!confirm("Batalkan permintaan lab ini?")) e.preventDefault();
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <TombolKecilBatal />
      {state?.pesan && <span className="text-xs text-clay-700">{state.pesan}</span>}
    </form>
  );
}

export default function FormPermintaanLab({
  kunjunganId,
  pegawaiId,
  katalog,
  permintaan,
  diagnosisAwal,
  galat,
}: {
  kunjunganId: string;
  pegawaiId: string;
  katalog: KatalogLabRingkas[];
  permintaan: PermintaanLabTercatat[];
  diagnosisAwal: string;
  galat: string | null;
}) {
  const [state, aksi] = useFormState(buatPermintaanLabAction, null);
  const [terpilih, setTerpilih] = useState<string[]>([]);
  const [cari, setCari] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) {
      formRef.current?.reset();
      setTerpilih([]);
      setCari("");
    }
  }, [state]);

  const kategori = useMemo(
    () => [...new Set([...KATEGORI_LAB, ...katalog.map((k) => k.kategori)])].filter((k) => katalog.some((x) => x.kategori === k)),
    [katalog]
  );

  const kata = cari.trim().toLowerCase();
  const tersaring = katalog.filter(
    (k) => !kata || k.nama.toLowerCase().includes(kata) || (k.kode ?? "").toLowerCase().includes(kata)
  );

  const belumDilihat = permintaan.filter(
    (p) => p.status === "selesai" && !p.hasil_dilihat_pada && p.diminta_oleh === pegawaiId
  );
  const masihBerjalan = permintaan.some((p) => ["diminta", "sampel_diterima", "proses"].includes(p.status));

  function alih(id: string) {
    setTerpilih((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  }

  return (
    <div className="space-y-5">
      {belumDilihat.map((p) => (
        <TandaiDilihatLab key={p.id} id={p.id} />
      ))}

      {galat ? (
        <p className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-4 py-3 text-sm text-clay-700">
          Modul Laboratorium belum siap: {galat}. Jalankan migrasi_tahap_43.sql di Supabase.
        </p>
      ) : (
        <form ref={formRef} action={aksi} className="space-y-4">
          <input type="hidden" name="kunjungan_id" value={kunjunganId} />
          <input type="hidden" name="pemeriksaan_ids" value={JSON.stringify(terpilih)} />

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={labelCls}>Pilih pemeriksaan ({terpilih.length} dipilih)</p>
              <input
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari pemeriksaan..."
                className={`${inputCls} max-w-[220px]`}
                aria-label="Cari pemeriksaan"
              />
            </div>
            <div className="max-h-72 space-y-3 overflow-y-auto rounded-sm border border-sand-100 bg-sand-50 p-3.5">
              {kategori.map((k) => {
                const daftar = tersaring.filter((x) => x.kategori === k);
                if (daftar.length === 0) return null;
                return (
                  <div key={k}>
                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/40">{k}</p>
                    <div className="flex flex-wrap gap-2">
                      {daftar.map((x) => {
                        const aktif = terpilih.includes(x.id);
                        return (
                          <label
                            key={x.id}
                            className={`flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-1.5 text-sm ${
                              aktif ? "border-teal-700 bg-teal-700/10 text-teal-700" : "border-sand-100 bg-white text-ink/70 hover:bg-white/60"
                            }`}
                          >
                            <input type="checkbox" checked={aktif} onChange={() => alih(x.id)} className="h-3.5 w-3.5 accent-teal-700" />
                            {x.nama}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {tersaring.length === 0 && (
                <p className="text-center text-xs text-ink/45">
                  {katalog.length === 0 ? "Katalog pemeriksaan masih kosong." : "Tidak ada pemeriksaan yang cocok."}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[160px_1fr_1fr]">
            <label className="space-y-1.5">
              <span className={labelCls}>Prioritas</span>
              <select name="prioritas" defaultValue="rutin" className={inputCls}>
                <option value="rutin">Rutin</option>
                <option value="cito">Cito (segera)</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className={labelCls}>Diagnosis kerja</span>
              <input name="diagnosis_kerja" defaultValue={diagnosisAwal} className={inputCls} placeholder="mis. Suspek DBD" />
            </label>
            <label className="space-y-1.5">
              <span className={labelCls}>Catatan untuk Lab</span>
              <input name="catatan_klinis" className={inputCls} placeholder="mis. Pasien puasa 10 jam" />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <TombolKirim />
            {state?.pesan && (
              <p role="status" className={`text-sm ${state.sukses ? "text-teal-700" : "text-clay-700"}`}>
                {state.pesan}
              </p>
            )}
          </div>
        </form>
      )}

      {permintaan.length > 0 && (
        <div className="space-y-3 border-t border-sand-100 pt-4">
          <p className="text-xs uppercase tracking-wide text-ink/40">Permintaan lab kunjungan ini</p>
          {masihBerjalan && (
            <p className="rounded-sm bg-sand-50 px-3.5 py-2.5 text-xs text-ink/60">
              Ada permintaan yang belum selesai. Kalau kunjungan ditutup lebih dulu, hasilnya tetap masuk ke menu Hasil
              Laboratorium.
            </p>
          )}
          {permintaan.map((p) => {
            const item = p.items.filter((i) => !i.dibatalkan);
            return (
              <div key={p.id} className="space-y-3 rounded-sm border border-sand-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-ink">
                    {p.no_lab}{" "}
                    <span className="font-normal text-ink/50">· {item.map((i) => i.pemeriksaan?.nama ?? "—").join(", ")}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <PilPrioritasLab prioritas={p.prioritas} />
                    <PilStatusLab status={p.status} />
                  </div>
                </div>
                <PelacakLab status={p.status} />
                {p.status === "selesai" && (
                  <>
                    <TabelHasilLab items={item.map((i) => ({ id: i.id, nama: i.pemeriksaan?.nama ?? "—", hasil: i.hasil }))} />
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/lab/${p.id}/cetak`}
                        className="rounded-sm border border-sand-100 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-sand-50"
                      >
                        Cetak hasil
                      </Link>
                    </div>
                  </>
                )}
                {p.status === "diminta" && p.diminta_oleh === pegawaiId && <TombolBatal id={p.id} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
