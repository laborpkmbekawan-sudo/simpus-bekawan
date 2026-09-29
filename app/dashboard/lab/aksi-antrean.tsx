"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { batalkanPermintaanLabAction, terimaSampelAction } from "./actions";

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

export default function AksiAntreanLab({ id, status, bisaLab = true }: { id: string; status: string; bisaLab?: boolean }) {
  const [stateTerima, aksiTerima] = useFormState(terimaSampelAction, null);
  const [stateBatal, aksiBatal] = useFormState(batalkanPermintaanLabAction, null);
  const pesan = stateTerima?.pesan || stateBatal?.pesan;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {bisaLab && status === "diminta" && (
          <form action={aksiTerima}>
            <input type="hidden" name="id" value={id} />
            <Tombol label="Terima sampel" warna="utama" />
          </form>
        )}
        {bisaLab && (status === "sampel_diterima" || status === "proses") && (
          <Link
            href={`/dashboard/lab/${id}`}
            className="rounded-sm bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-900"
          >
            {status === "proses" ? "Lanjut input hasil" : "Input hasil"}
          </Link>
        )}
        {(bisaLab ? status === "diminta" || status === "sampel_diterima" || status === "proses" : status === "diminta") && (
          <form
            action={aksiBatal}
            onSubmit={(e) => {
              const alasan = prompt("Alasan pembatalan (mis. sampel tidak memenuhi syarat):");
              if (alasan === null) {
                e.preventDefault();
                return;
              }
              const f = e.currentTarget;
              let isian = f.querySelector<HTMLInputElement>('input[name="alasan"]');
              if (!isian) {
                isian = document.createElement("input");
                isian.type = "hidden";
                isian.name = "alasan";
                f.appendChild(isian);
              }
              isian.value = alasan;
            }}
          >
            <input type="hidden" name="id" value={id} />
            <Tombol label="Batalkan" warna="bahaya" />
          </form>
        )}
        {status === "selesai" && (
          <>
            <Link
              href={`/dashboard/lab/hasil/${id}`}
              className="rounded-sm border border-sand-100 px-3.5 py-2 text-xs font-semibold text-teal-700 hover:bg-sand-50"
            >
              Lihat hasil
            </Link>
            <Link
              href={`/dashboard/lab/${id}/cetak`}
              className="rounded-sm border border-sand-100 px-3.5 py-2 text-xs font-semibold text-ink/70 hover:bg-sand-50"
            >
              Cetak
            </Link>
          </>
        )}
      </div>
      {pesan && (
        <p role="alert" className="text-xs text-clay-700">
          {pesan}
        </p>
      )}
    </div>
  );
}
