"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { hapusLotAction, ubahStatusLotAction } from "../actions";

function Tombol({ teks, gaya }: { teks: string; gaya: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`rounded-sm px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${gaya}`}>
      {pending ? "..." : teks}
    </button>
  );
}

const netral = "border border-sand-100 text-ink/70 hover:bg-sand-50";

export default function AksiLot({ id, status }: { id: string; status: string }) {
  const [stateStatus, aksiStatus] = useFormState(ubahStatusLotAction, null);
  const [stateHapus, aksiHapus] = useFormState(hapusLotAction, null);
  const formBuangRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (stateStatus?.sukses) formBuangRef.current?.reset();
  }, [stateStatus]);

  if (status === "habis" || status === "dibuang") return null;
  const pesan = stateStatus?.pesan || stateHapus?.pesan;
  const sukses = stateStatus?.pesan ? stateStatus.sukses : stateHapus?.sukses;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {status === "tersimpan" && (
          <form action={aksiStatus}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value="dipakai" />
            <Tombol teks="Mulai dipakai" gaya="bg-teal-700 text-white hover:bg-teal-900" />
          </form>
        )}
        <form action={aksiStatus}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value="habis" />
          <Tombol teks="Tandai habis" gaya={netral} />
        </form>
        {status === "tersimpan" && (
          <form
            action={aksiHapus}
            onSubmit={(e) => {
              if (!window.confirm("Hapus lot ini? Hanya untuk salah input.")) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={id} />
            <Tombol teks="Hapus (salah input)" gaya="border border-red-500/30 text-red-600 hover:bg-red-500/5" />
          </form>
        )}
      </div>
      <form ref={formBuangRef} action={aksiStatus} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value="dibuang" />
        <input
          name="catatan"
          required
          placeholder="Alasan dibuang (kadaluarsa, kontaminasi...)"
          className="min-w-[200px] flex-1 rounded-sm border border-sand-100 bg-[#FBFDFF] px-3 py-1.5 text-xs"
        />
        <Tombol teks="Buang lot" gaya="bg-red-600 text-white hover:bg-red-700" />
      </form>
      {pesan && (
        <p role="alert" className={`rounded-sm px-3 py-2 text-sm ${sukses ? "bg-teal-700/10 text-teal-700" : "bg-red-500/10 text-red-600"}`}>
          {pesan}
        </p>
      )}
    </div>
  );
}
