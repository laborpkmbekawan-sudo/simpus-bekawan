"use client";

import { useFormState, useFormStatus } from "react-dom";
import { ubahBatasKritisAction } from "../actions";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm border border-sand-100 px-2.5 py-1 text-xs font-semibold text-ink/70 hover:bg-sand-50 disabled:opacity-60"
    >
      {pending ? "..." : "Simpan"}
    </button>
  );
}

export default function BatasKritis({
  id,
  kritisMin,
  kritisMax,
}: {
  id: string;
  kritisMin: number | null;
  kritisMax: number | null;
}) {
  const [state, aksi] = useFormState(ubahBatasKritisAction, null);
  const cls = "w-20 rounded-sm border border-sand-100 bg-[#FBFDFF] px-2 py-1 text-xs";
  return (
    <form action={aksi} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <span className="text-[11px] text-ink/45">&lt;</span>
      <input name="kritis_min" defaultValue={kritisMin ?? ""} inputMode="decimal" aria-label="Batas kritis bawah" className={cls} placeholder="bawah" />
      <span className="text-[11px] text-ink/45">atau &gt;</span>
      <input name="kritis_max" defaultValue={kritisMax ?? ""} inputMode="decimal" aria-label="Batas kritis atas" className={cls} placeholder="atas" />
      <Tombol />
      {state?.pesan && (
        <span role={state.sukses ? "status" : "alert"} className={`text-[11px] ${state.sukses ? "text-teal-700" : "text-clay-700"}`}>
          {state.pesan}
        </span>
      )}
    </form>
  );
}
