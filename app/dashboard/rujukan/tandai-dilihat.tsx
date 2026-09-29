"use client";

import { useEffect } from "react";
import { useNotifikasiRujukan } from "../notifikasi-rujukan";
import { tandaiPembaruanRujukanDilihatAction } from "./actions";

// Dipasang di tab Rujukan Keluar: membuka tab ini = pembaruan status rujukan
// dianggap sudah dilihat. `kunci` berubah saat daftar berubah (rujukan baru
// diterima / selesai saat tab terbuka), sehingga ikut ditandai juga.
export default function TandaiDilihat({ kunci }: { kunci: string }) {
  const { segarkan } = useNotifikasiRujukan();

  useEffect(() => {
    let batal = false;
    tandaiPembaruanRujukanDilihatAction()
      .then(() => {
        if (!batal) segarkan();
      })
      .catch(() => {});
    return () => {
      batal = true;
    };
  }, [kunci, segarkan]);

  return null;
}
