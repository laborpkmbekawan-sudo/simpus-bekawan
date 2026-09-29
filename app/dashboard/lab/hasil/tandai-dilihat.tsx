"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { tandaiHasilDilihatAction } from "../actions";

// Dipasang di halaman detail hasil: begitu peminta membuka hasil selesai,
// notifikasinya hilang. Fungsi databasenya cuma bereaksi untuk peminta asli.
export default function TandaiDilihatLab({ id }: { id: string }) {
  const router = useRouter();
  useEffect(() => {
    tandaiHasilDilihatAction(id).then(() => router.refresh());
  }, [id, router]);
  return null;
}
