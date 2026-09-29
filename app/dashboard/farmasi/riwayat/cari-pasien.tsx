"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Pasien = { id: string; no_rm: string; nama_lengkap: string };

export default function CariPasien({ semuaPasien }: { semuaPasien: Pasien[] }) {
  const [kataKunci, setKataKunci] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasil = useMemo(() => {
    const q = kataKunci.trim().toLowerCase();
    if (!q) return [];
    return semuaPasien
      .filter((p) => p.nama_lengkap.toLowerCase().includes(q) || p.no_rm.includes(q))
      .slice(0, 8);
  }, [kataKunci, semuaPasien]);

  function pilih(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pasien_id", id);
    router.push(`?${params.toString()}`);
    setKataKunci("");
  }

  return (
    <div className="relative">
      <input
        value={kataKunci}
        onChange={(e) => setKataKunci(e.target.value)}
        placeholder="Cari nama atau No. RM pasien..."
        className="w-full max-w-sm rounded-sm border border-sand-100 bg-white px-3.5 py-2.5 text-sm"
      />
      {hasil.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-w-sm overflow-hidden rounded-sm border border-sand-100 bg-white shadow-lg">
          {hasil.map((p) => (
            <button
              key={p.id}
              onClick={() => pilih(p.id)}
              className="block w-full px-3.5 py-2 text-left text-sm hover:bg-sand-50"
            >
              {p.nama_lengkap} <span className="text-ink/40">· {p.no_rm}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
