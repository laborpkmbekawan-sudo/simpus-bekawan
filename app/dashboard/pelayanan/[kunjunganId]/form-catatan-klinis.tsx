"use client";

import { useFormState, useFormStatus } from "react-dom";
import { simpanCatatanKlinisAction } from "./actions";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Catatan"}
    </button>
  );
}

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";

function Bagian({
  huruf,
  judul,
  petunjuk,
  children,
}: {
  huruf: string;
  judul: string;
  petunjuk?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span
        aria-hidden
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-teal-700 text-sm font-extrabold text-white"
      >
        {huruf}
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-bold text-ink/80">{judul}</p>
        {petunjuk && <p className="text-xs text-ink/50">{petunjuk}</p>}
        {children}
      </div>
    </div>
  );
}

export default function FormCatatanKlinis({
  kunjunganId,
  subjektif,
  subjektifDariSkrining,
  objektif,
  diagnosis,
  kodeIcd10,
  tindakan,
}: {
  kunjunganId: string;
  subjektif: string;
  subjektifDariSkrining: boolean;
  objektif: string;
  diagnosis: string;
  kodeIcd10: string;
  tindakan: string;
}) {
  const [state, formAction] = useFormState(simpanCatatanKlinisAction, null);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="kunjungan_id" value={kunjunganId} />

      <Bagian
        huruf="S"
        judul="Subjektif"
        petunjuk={
          subjektifDariSkrining
            ? "Keluhan dan anamnesis. Terisi otomatis dari keluhan utama skrining, ubah atau lengkapi bila perlu."
            : "Keluhan dan anamnesis: keluhan utama, riwayat penyakit sekarang dan dahulu, riwayat pengobatan."
        }
      >
        <textarea
          id="subjektif"
          name="subjektif"
          rows={3}
          defaultValue={subjektif}
          aria-label="Subjektif"
          className={inputCls}
        />
      </Bagian>

      <Bagian
        huruf="O"
        judul="Objektif"
        petunjuk="Pemeriksaan fisik dan penunjang. Tanda vital dari skrining sudah tampil di atas."
      >
        <textarea
          id="objektif"
          name="objektif"
          rows={4}
          defaultValue={objektif}
          aria-label="Objektif"
          placeholder="Hasil pemeriksaan fisik, lab, EKG, dst."
          className={inputCls}
        />
      </Bagian>

      <Bagian huruf="A" judul="Asesmen" petunjuk="Diagnosis kerja / diagnosis banding.">
        <input id="diagnosis" name="diagnosis" defaultValue={diagnosis} aria-label="Asesmen" className={inputCls} />
        <div className="pt-1.5">
          <label htmlFor="kode_icd10" className="mb-1 block text-xs text-ink/50">
            Kode ICD-10 (opsional, buat rekap Laporan LB1)
          </label>
          <input
            id="kode_icd10"
            name="kode_icd10"
            defaultValue={kodeIcd10}
            placeholder="contoh: J06.9"
            className={`${inputCls} max-w-[180px] uppercase`}
          />
        </div>
      </Bagian>

      <Bagian huruf="P" judul="Plan" petunjuk="Terapi, edukasi, dan rencana tindak lanjut.">
        <textarea
          id="tindakan"
          name="tindakan"
          rows={3}
          defaultValue={tindakan}
          aria-label="Plan"
          placeholder="contoh: Paracetamol 3x500 mg, edukasi istirahat, kontrol 3 hari"
          className={inputCls}
        />
      </Bagian>

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

      <TombolSimpan />
    </form>
  );
}
