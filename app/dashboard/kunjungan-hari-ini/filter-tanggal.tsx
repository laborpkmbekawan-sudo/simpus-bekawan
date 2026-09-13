"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function FilterTanggal({ tanggal }: { tanggal: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function ubahTanggal(nilai: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tanggal", nilai);
    router.push(`?${params.toString()}`);
  }

  const hariIni = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={tanggal}
        onChange={(e) => ubahTanggal(e.target.value)}
        className="rounded-sm border border-sand-100 bg-white px-3 py-2 text-sm"
      />
      {tanggal !== hariIni && (
        <button
          onClick={() => ubahTanggal(hariIni)}
          className="text-xs font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
        >
          Kembali ke hari ini
        </button>
      )}
    </div>
  );
}
