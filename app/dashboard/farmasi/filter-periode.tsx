"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function FilterPeriode({ dari, sampai }: { dari: string; sampai: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function ubah(kunci: "dari" | "sampai", nilai: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(kunci, nilai);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-xs font-bold text-ink/60">Dari tanggal</label>
        <input
          type="date"
          value={dari}
          onChange={(e) => ubah("dari", e.target.value)}
          className="rounded-sm border border-sand-100 bg-white px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-bold text-ink/60">Sampai tanggal</label>
        <input
          type="date"
          value={sampai}
          onChange={(e) => ubah("sampai", e.target.value)}
          className="rounded-sm border border-sand-100 bg-white px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
