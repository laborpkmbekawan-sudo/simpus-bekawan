"use client";

import { useFormState, useFormStatus } from "react-dom";
import { evaluasiPmeAction, hapusPmeAction, laporPmeAction } from "../actions";

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

export default function AksiPme({
  id,
  status,
  jenis,
  satuan,
  hariIni,
}: {
  id: string;
  status: string;
  jenis: string;
  satuan: string | null;
  hariIni: string;
}) {
  const [stLapor, aksiLapor] = useFormState(laporPmeAction, null);
  const [stEval, aksiEval] = useFormState(evaluasiPmeAction, null);
  const [stHapus, aksiHapus] = useFormState(hapusPmeAction, null);
  const kuantitatif = jenis === "kuantitatif";

  return (
    <div className="space-y-3">
      {status !== "dievaluasi" && (
        <details className="rounded-sm border border-sand-100 bg-[#FBFDFF] p-3" open={status === "diterima"}>
          <summary className="cursor-pointer text-sm font-bold text-teal-700">
            {status === "diterima" ? "Catat hasil lab yang dilaporkan" : "Koreksi hasil lab yang dilaporkan"}
          </summary>
          <form action={aksiLapor} className="mt-3 flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={id} />
            {kuantitatif ? (
              <label className="space-y-1">
                <span className={labelCls}>Nilai hasil lab{satuan ? ` (${satuan})` : ""}</span>
                <input name="nilai_lab" required inputMode="decimal" className={`${cls} w-40`} />
              </label>
            ) : (
              <label className="space-y-1">
                <span className={labelCls}>Hasil lab</span>
                <input name="hasil_lab" required className={`${cls} w-48`} placeholder="mis. Reaktif" />
              </label>
            )}
            <label className="space-y-1">
              <span className={labelCls}>Tanggal dilaporkan</span>
              <input name="tanggal_dilaporkan" type="date" defaultValue={hariIni} max={hariIni} className={`${cls} w-44`} />
            </label>
            <Tombol teks="Simpan hasil" />
          </form>
          <div className="mt-2">
            <Pesan state={stLapor} />
          </div>
        </details>
      )}

      {status !== "diterima" && (
        <details className="rounded-sm border border-sand-100 bg-[#FBFDFF] p-3" open={status === "dilaporkan"}>
          <summary className="cursor-pointer text-sm font-bold text-teal-700">
            {status === "dilaporkan" ? "Masukkan hasil evaluasi penyelenggara" : "Ubah hasil evaluasi"}
          </summary>
          <form action={aksiEval} className="mt-3 space-y-3">
            <input type="hidden" name="id" value={id} />
            <div className="grid gap-3 sm:grid-cols-4">
              {kuantitatif ? (
                <>
                  <label className="space-y-1">
                    <span className={labelCls}>Nilai target</span>
                    <input name="nilai_target" required inputMode="decimal" className={cls} />
                  </label>
                  <label className="space-y-1">
                    <span className={labelCls}>SD peserta</span>
                    <input name="sd_peserta" required inputMode="decimal" className={cls} />
                  </label>
                </>
              ) : (
                <label className="space-y-1 sm:col-span-2">
                  <span className={labelCls}>Hasil yang benar (kunci)</span>
                  <input name="hasil_benar" required className={cls} />
                </label>
              )}
              <label className="space-y-1">
                <span className={labelCls}>Skor penyelenggara (opsional)</span>
                <input name="skor" inputMode="decimal" className={cls} />
              </label>
              <label className="space-y-1 sm:col-span-4">
                <span className={labelCls}>Tindak lanjut (wajib kalau peringatan / tidak memuaskan)</span>
                <input name="tindak_lanjut" className={cls} placeholder="investigasi penyebab, tindakan perbaikan" />
              </label>
            </div>
            <Tombol teks="Simpan evaluasi" />
            <p className="text-xs text-ink/50">
              {kuantitatif
                ? "SDI = (nilai lab - target) / SD peserta. Sampai 2 memuaskan, 2-3 peringatan, lebih dari 3 tidak memuaskan."
                : "Hasil lab dibandingkan dengan kunci. Beda = tidak memuaskan."}
            </p>
          </form>
          <div className="mt-2">
            <Pesan state={stEval} />
          </div>
        </details>
      )}

      {status === "diterima" && (
        <form
          action={aksiHapus}
          onSubmit={(e) => {
            if (!window.confirm("Hapus siklus ini? Hanya untuk salah input.")) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={id} />
          <Tombol teks="Hapus (salah input)" gaya="border border-red-500/30 text-red-600 hover:bg-red-500/5 !px-3 !py-1.5 !text-xs" />
          <div className="mt-2">
            <Pesan state={stHapus} />
          </div>
        </form>
      )}
    </div>
  );
}
