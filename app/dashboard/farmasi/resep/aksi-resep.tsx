"use client";

import { useFormState, useFormStatus } from "react-dom";
import { verifikasiSerahResepAction, batalkanResepAction } from "./actions";

function Tombol({ label, warna }: { label: string; warna: "utama" | "bahaya" }) {
  const { pending } = useFormStatus();
  const cls =
    warna === "utama"
      ? "bg-teal-700 text-white hover:bg-teal-900"
      : "border border-clay-600/30 text-clay-700 hover:bg-clay-600/10";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-sm px-3.5 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${cls}`}
    >
      {pending ? "Memproses..." : label}
    </button>
  );
}

export default function AksiResep({ resepId }: { resepId: string }) {
  const [stateSerah, aksiSerah] = useFormState(verifikasiSerahResepAction, null);
  const [stateBatal, aksiBatal] = useFormState(batalkanResepAction, null);
  const pesan = stateSerah?.pesan || stateBatal?.pesan;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <form action={aksiSerah}>
          <input type="hidden" name="resep_id" value={resepId} />
          <Tombol label="Verifikasi & Serahkan" warna="utama" />
        </form>
        <form
          action={aksiBatal}
          onSubmit={(e) => {
            if (!confirm("Batalkan resep ini?")) e.preventDefault();
          }}
        >
          <input type="hidden" name="resep_id" value={resepId} />
          <Tombol label="Batalkan" warna="bahaya" />
        </form>
      </div>
      {pesan && (
        <p role="alert" className="text-xs text-clay-700">
          {pesan}
        </p>
      )}
    </div>
  );
}
