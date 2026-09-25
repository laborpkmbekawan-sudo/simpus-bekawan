"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahTemuanAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

export const LABEL_JENIS_AUDIT: Record<string, string> = {
  audit_internal: "Audit Internal",
  audit_rekam_medis: "Audit Rekam Medis",
  audit_keuangan: "Audit Keuangan",
  audit_mutu: "Audit Mutu",
};

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Catat Temuan"}
    </button>
  );
}

export default function FormTambahTemuan() {
  const [state, formAction] = useFormState(tambahTemuanAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-1.5">
        <label htmlFor="tanggal_audit" className={labelCls}>
          Tanggal
        </label>
        <input
          id="tanggal_audit"
          name="tanggal"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="jenis_audit" className={labelCls}>
          Jenis audit
        </label>
        <select id="jenis_audit" name="jenis_audit" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            Pilih jenis...
          </option>
          {Object.entries(LABEL_JENIS_AUDIT).map(([nilai, label]) => (
            <option key={nilai} value={nilai}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="batas_waktu_audit" className={labelCls}>
          Batas waktu tindak lanjut
        </label>
        <input id="batas_waktu_audit" name="batas_waktu" type="date" className={inputCls} />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="temuan" className={labelCls}>
          Uraian temuan
        </label>
        <textarea id="temuan" name="temuan" required rows={2} className={inputCls} />
      </div>

      <div className="space-y-1.5 sm:col-span-3">
        <label htmlFor="rekomendasi" className={labelCls}>
          Rekomendasi
        </label>
        <textarea id="rekomendasi" name="rekomendasi" rows={2} className={inputCls} />
      </div>

      <div className="sm:col-span-3">
        {state?.pesan && (
          <p
            role="alert"
            className={`mb-3 rounded-sm px-3.5 py-2.5 text-sm ${
              state.sukses ? "bg-teal-500/10 text-teal-700" : "bg-clay-600/10 text-clay-700"
            }`}
          >
            {state.pesan}
          </p>
        )}
        <TombolSimpan />
      </div>
    </form>
  );
}
