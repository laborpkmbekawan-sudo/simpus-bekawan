"use client";

import { useState } from "react";
import { ubahStatusRujukanAction } from "./actions";

export default function AksiRujukan({
  id,
  jenis,
  status,
  bolehTerima,
  bolehSelesai,
  bolehBatal,
}: {
  id: string;
  jenis: string;
  status: string;
  bolehTerima: boolean;
  bolehSelesai: boolean;
  bolehBatal: boolean;
}) {
  const [pending, setPending] = useState(false);

  async function ubah(statusBaru: "diterima" | "selesai" | "dibatalkan") {
    let catatan: string | undefined;
    if (statusBaru === "selesai") {
      const isi = window.prompt(jenis === "eksternal" ? "Catatan (mis. pasien sudah berangkat / diterima RS), boleh dikosongkan:" : "Catatan tindak lanjut (boleh dikosongkan):");
      if (isi === null) return;
      catatan = isi;
    }
    if (statusBaru === "dibatalkan" && !window.confirm("Batalkan rujukan ini?")) return;
    setPending(true);
    await ubahStatusRujukanAction(id, statusBaru, catatan);
    setPending(false);
  }

  const cls = "rounded-sm px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50";
  const tombol: React.ReactNode[] = [];

  if (jenis === "internal" && status === "dibuat" && bolehTerima)
    tombol.push(<button key="t" onClick={() => ubah("diterima")} disabled={pending} className={`${cls} bg-teal-700 hover:bg-teal-900`}>Terima</button>);
  const bisaSelesai = jenis === "internal" ? status === "diterima" : status === "dibuat";
  if (bisaSelesai && bolehSelesai)
    tombol.push(<button key="s" onClick={() => ubah("selesai")} disabled={pending} className={`${cls} bg-ink hover:bg-ink/85`}>Selesai</button>);
  if ((status === "dibuat" || status === "diterima") && bolehBatal)
    tombol.push(<button key="b" onClick={() => ubah("dibatalkan")} disabled={pending} className="text-xs font-medium text-clay-700 underline decoration-clay-700/30 underline-offset-2 disabled:opacity-50">Batalkan</button>);

  if (tombol.length === 0) return <span className="text-xs text-ink/40">—</span>;
  return <div className="flex flex-wrap items-center gap-2">{tombol}</div>;
}
