"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Obat = { id: string; nama_obat: string };

export default function CariObat({ daftarObat }: { daftarObat: Obat[] }) {
  const [kataKunci, setKataKunci] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasil = useMemo(() => {
    const q = kataKunci.trim().toLowerCase();
    if (!q) return [];
    return daftarObat.filter((o) => o.nama_obat.toLowerCase().includes(q)).slice(0, 8);
  }, [kataKunci, daftarObat]);

  function pilih(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("obat_id", id);
    router.push(`?${params.toString()}`);
    setKataKunci("");
  }

  return (
    <div className="relative">
      <input
        value={kataKunci}
        onChange={(e) => setKataKunci(e.target.value)}
        placeholder="Ketik nama obat..."
        className="w-full max-w-sm rounded-sm border border-sand-100 bg-white px-3.5 py-2.5 text-sm"
      />
      {hasil.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-w-sm overflow-hidden rounded-sm border border-sand-100 bg-white shadow-lg">
          {hasil.map((o) => (
            <button
              key={o.id}
              onClick={() => pilih(o.id)}
              className="block w-full px-3.5 py-2 text-left text-sm hover:bg-sand-50"
            >
              {o.nama_obat}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
