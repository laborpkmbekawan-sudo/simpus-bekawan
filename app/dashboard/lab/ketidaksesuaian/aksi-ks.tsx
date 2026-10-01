"use client";

import { useFormState, useFormStatus } from "react-dom";
import { tindakLanjutKsAction, tutupKsAction } from "../actions";

const cls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3 py-2 text-sm";
const labelCls = "text-xs font-bold text-ink/70";

function Tombol({ teks, gaya = "bg-teal-700 text-white hover:bg-teal-900" }: { teks: string; gaya?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`rounded-sm px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${gaya}`}>
      {pending ? "..." : teks}
    </button>
  );
}

function Pesan({ state }: { state: { pesan: string; sukses: boolean } | null }) {
  if (!state?.pesan) return null;
  return (
    <p role="alert" className={`rounded-sm px-3 py-2 text-sm ${state.sukses ? "bg-teal-700/10 text-teal-700" : "bg-red-500/10 text-red-600"}`}>
      {state.pesan}
    </p>
  );
}

export default function AksiKs({
  id,
  status,
  penyebab,
  tindakan,
  penanggungJawab,
  tenggat,
}: {
  id: string;
  status: string;
  penyebab: string | null;
  tindakan: string | null;
  penanggungJawab: string | null;
  tenggat: string | null;
}) {
  const [stTindak, aksiTindak] = useFormState(tindakLanjutKsAction, null);
  const [stTutup, aksiTutup] = useFormState(tutupKsAction, null);
  if (status === "ditutup") return null;

  return (
    <div className="space-y-3">
      <details className="rounded-sm border border-sand-100 bg-[#FBFDFF] p-3" open={status === "terbuka"}>
        <summary className="cursor-pointer text-sm font-bold text-teal-700">
          {status === "terbuka" ? "Isi analisis penyebab & tindakan korektif" : "Ubah analisis & tindakan korektif"}
        </summary>
        <form action={aksiTindak} className="mt-3 space-y-3">
          <input type="hidden" name="id" value={id} />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 sm:col-span-3">
              <span className={labelCls}>Penyebab (akar masalah)</span>
              <textarea name="penyebab" required rows={2} defaultValue={penyebab ?? ""} className={cls} />
            </label>
            <label className="space-y-1 sm:col-span-3">
              <span className={labelCls}>Tindakan korektif</span>
              <textarea name="tindakan_korektif" required rows={2} defaultValue={tindakan ?? ""} className={cls} />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className={labelCls}>Penanggung jawab (opsional)</span>
              <input name="penanggung_jawab" defaultValue={penanggungJawab ?? ""} className={cls} />
            </label>
            <label className="space-y-1">
              <span className={labelCls}>Tenggat (opsional)</span>
              <input name="tenggat" type="date" defaultValue={tenggat ?? ""} className={cls} />
            </label>
          </div>
          <Tombol teks="Simpan tindak lanjut" />
        </form>
        <div className="mt-2">
          <Pesan state={stTindak} />
        </div>
      </details>

      {status === "ditindaklanjuti" && (
        <form action={aksiTutup} className="space-y-2 rounded-sm border border-sand-100 bg-[#FBFDFF] p-3">
          <input type="hidden" name="id" value={id} />
          <label className="space-y-1">
            <span className={labelCls}>Verifikasi efektivitas (bukti masalah tidak terulang)</span>
            <textarea name="verifikasi" required rows={2} className={cls} placeholder="mis. QC 5 hari berturut-turut dalam kendali" />
          </label>
          <Tombol teks="Tutup laporan" gaya="bg-ink text-white hover:bg-ink/90" />
          <p className="text-xs text-ink/50">Laporan yang sudah ditutup tidak bisa diubah. Kalau terulang, buat laporan baru.</p>
          <Pesan state={stTutup} />
        </form>
      )}
    </div>
  );
}
