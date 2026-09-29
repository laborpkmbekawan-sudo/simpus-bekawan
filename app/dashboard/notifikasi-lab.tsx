"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { bukaKunciAudio, bunyi } from "./notifikasi-rujukan";

// Notifikasi Laboratorium, dua arah, mengikuti pola notifikasi rujukan:
//
// - mode "lab"    : permintaan dari klaster yang berstatus 'diminta' (belum
//                   diterima Lab). Hilang begitu ada petugas Lab menerima sampel.
// - mode "klinis" : hasil lab MILIK PEMINTA sendiri yang sudah 'selesai'
//                   (divalidasi) tapi belum dibuka. Hilang saat hasil dibuka.
//
// Sumber kebenaran tabel lab_permintaan, jadi yang baru login tetap melihat
// yang menunggu. Update: Realtime (instan) + polling 30 dtk + saat tab fokus.

const JEDA_POLLING_MS = 30_000;
const MAKS_TOAST_TAMPIL = 3;

export type ModeNotifikasiLab = "lab" | "klinis" | null;

type Toast = { kunci: string; judul: string; isi: string; tautan: string; label: string };

type Konteks = { mode: ModeNotifikasiLab; jumlah: number };

const KonteksLab = createContext<Konteks>({ mode: null, jumlah: 0 });

export function useNotifikasiLab() {
  return useContext(KonteksLab);
}

type BarisMentah = {
  id: string;
  no_lab: string;
  prioritas: string;
  kunjungan: {
    pasien: { nama_lengkap: string } | null;
    klaster: { nama: string } | null;
  } | null;
};

export function ProviderNotifikasiLab({
  mode,
  pegawaiId,
  children,
}: {
  mode: ModeNotifikasiLab;
  pegawaiId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const [jumlah, setJumlah] = useState(0);
  const [toast, setToast] = useState<Toast[]>([]);

  // null = sinkron pertama belum selesai (yang sudah menunggu saat login
  // cuma jadi satu toast ringkasan, bukan banjir toast).
  const dikenal = useRef<Set<string> | null>(null);
  const urutan = useRef(0);
  const pathRef = useRef(pathname);
  const routerRef = useRef(router);
  pathRef.current = pathname;
  routerRef.current = router;

  const tutupToast = useCallback((kunci: string) => setToast((t) => t.filter((x) => x.kunci !== kunci)), []);

  const sinkron = useCallback(async (): Promise<boolean> => {
    if (!mode) return false;
    const nomor = ++urutan.current;

    let q = supabase
      .from("lab_permintaan")
      .select(
        "id, no_lab, prioritas, kunjungan:kunjungan_id (pasien:pasien_id (nama_lengkap), klaster:klaster_tujuan_id (nama))",
        { count: "exact" }
      )
      .order("diminta_pada", { ascending: false })
      .limit(50);

    q = mode === "lab"
      ? q.eq("status", "diminta")
      : q.eq("status", "selesai").is("hasil_dilihat_pada", null).eq("diminta_oleh", pegawaiId);

    const { data, count, error } = await q;
    // Sinkron lebih baru sudah jalan, atau tabel belum dibuat: abaikan.
    if (nomor !== urutan.current || error || !data) return false;

    const baris = data as unknown as BarisMentah[];
    const total = count ?? baris.length;
    const idSekarang = new Set(baris.map((b) => b.id));
    setJumlah(total);

    const toastBaru: Toast[] = [];
    let adaBaru = false;

    if (dikenal.current === null) {
      if (total > 0) {
        toastBaru.push(
          mode === "lab"
            ? { kunci: "ringkasan", judul: "Permintaan lab menunggu", isi: `${total} permintaan belum diterima Lab.`, tautan: "/dashboard/lab", label: "Buka antrean" }
            : { kunci: "ringkasan", judul: "Hasil lab tersedia", isi: `${total} hasil lab belum kamu buka.`, tautan: "/dashboard/lab/hasil?tampil=selesai", label: "Lihat hasil" }
        );
      }
    } else {
      for (const b of baris.filter((x) => !dikenal.current!.has(x.id))) {
        adaBaru = true;
        const nama = b.kunjungan?.pasien?.nama_lengkap ?? "Pasien";
        toastBaru.push(
          mode === "lab"
            ? {
                kunci: b.id,
                judul: b.prioritas === "cito" ? "Permintaan lab CITO" : "Permintaan lab baru",
                isi: `${nama} — dari ${b.kunjungan?.klaster?.nama ?? "klaster"} (${b.no_lab})`,
                tautan: "/dashboard/lab",
                label: "Buka antrean",
              }
            : {
                kunci: b.id,
                judul: "Hasil lab selesai",
                isi: `${nama} (${b.no_lab}) sudah divalidasi Lab.`,
                tautan: `/dashboard/lab/hasil/${b.id}`,
                label: "Lihat hasil",
              }
        );
      }
    }
    dikenal.current = idSekarang;

    if (toastBaru.length > 0) bunyi();

    // Toast yang sudah tidak relevan (diterima petugas lain / sudah dibuka) ikut hilang.
    setToast((t) => {
      const sisa = t.filter((x) => {
        if (toastBaru.some((b) => b.kunci === x.kunci)) return false;
        return x.kunci === "ringkasan" ? idSekarang.size > 0 : idSekarang.has(x.kunci);
      });
      return [...toastBaru, ...sisa];
    });

    return adaBaru;
  }, [mode, pegawaiId, supabase]);

  useEffect(() => {
    if (!mode) return;
    window.addEventListener("pointerdown", bukaKunciAudio, { once: true });
    window.addEventListener("keydown", bukaKunciAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", bukaKunciAudio);
      window.removeEventListener("keydown", bukaKunciAudio);
    };
  }, [mode]);

  useEffect(() => {
    if (!mode) return;

    let batal = false;
    let kanal: ReturnType<typeof supabase.channel> | null = null;

    const saatBerubah = async () => {
      const adaBaru = await sinkron();
      const p = pathRef.current;
      // Halaman Lab ikut diperbarui otomatis. Halaman Pelayanan cuma disegarkan
      // saat hasil baru masuk, supaya isian yang sedang diketik tidak terganggu.
      if (p.startsWith("/dashboard/lab") || (mode === "klinis" && adaBaru && p.startsWith("/dashboard/pelayanan"))) {
        routerRef.current.refresh();
      }
    };

    async function mulai() {
      const { data } = await supabase.auth.getSession();
      if (batal) return;
      if (data.session) supabase.realtime.setAuth(data.session.access_token);

      await sinkron();
      if (batal) return;

      kanal = supabase
        .channel(`lab-${mode}-${pegawaiId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "lab_permintaan" }, saatBerubah)
        .subscribe();
    }

    mulai();

    const poll = setInterval(saatBerubah, JEDA_POLLING_MS);
    const saatKembali = () => {
      if (document.visibilityState === "visible") saatBerubah();
    };
    document.addEventListener("visibilitychange", saatKembali);
    window.addEventListener("focus", saatKembali);

    return () => {
      batal = true;
      clearInterval(poll);
      document.removeEventListener("visibilitychange", saatKembali);
      window.removeEventListener("focus", saatKembali);
      if (kanal) supabase.removeChannel(kanal);
    };
  }, [mode, pegawaiId, sinkron, supabase]);

  const nilai = useMemo<Konteks>(() => ({ mode, jumlah }), [mode, jumlah]);
  const tampil = toast.slice(0, MAKS_TOAST_TAMPIL);
  const sisa = toast.length - tampil.length;

  return (
    <KonteksLab.Provider value={nilai}>
      {children}

      {mode && toast.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex w-[360px] max-w-[calc(100vw-3rem)] flex-col gap-3 print:hidden"
        >
          {tampil.map((t) => (
            <div key={t.kunci} className="rounded-card border border-teal-700/40 bg-white p-4 shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold text-ink">{t.judul}</p>
                <button
                  type="button"
                  onClick={() => tutupToast(t.kunci)}
                  aria-label="Tutup notifikasi"
                  className="-mr-1 -mt-1 rounded-sm px-2 py-1 text-base leading-none text-ink/40 hover:bg-sand-50 hover:text-ink"
                >
                  ×
                </button>
              </div>
              <p className="mt-1 text-sm text-ink/70">{t.isi}</p>
              <Link
                href={t.tautan}
                onClick={() => tutupToast(t.kunci)}
                className="mt-3 inline-block rounded-sm bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-900"
              >
                {t.label}
              </Link>
            </div>
          ))}
          {sisa > 0 && (
            <p className="rounded-sm bg-white/90 px-3 py-1.5 text-center text-xs font-medium text-ink/60 shadow">
              +{sisa} notifikasi lain
            </p>
          )}
        </div>
      )}
    </KonteksLab.Provider>
  );
}
