"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Notifikasi rujukan masuk untuk tenaga klinis di lokasi tujuan.
//
// Sumber kebenaran = tabel rujukan itu sendiri: "belum ditangani" berarti
// rujukan internal, ke lokasi pegawai ini, berstatus 'dibuat'. Jadi tidak ada
// tabel notifikasi terpisah, dan pegawai yang baru login tetap melihat rujukan
// yang masuk saat dia offline. Begitu satu petugas menekan Terima, rujukan itu
// hilang dari notifikasi semua petugas lain di lokasi yang sama.
//
// Cara update: Supabase Realtime (instan) + polling 30 detik dan saat tab
// kembali fokus (cadangan kalau Realtime putus atau belum diaktifkan).

const JEDA_POLLING_MS = 30_000;
const KUNCI_SUARA = "simpus:notif-rujukan-suara";
const MAKS_TOAST_TAMPIL = 3;

type ItemRujukan = {
  id: string;
  namaPasien: string;
  noRm: string;
  asal: string;
  ringkas: string;
};

type Toast = {
  kunci: string;
  rujukanId?: string;
  judul: string;
  isi: string;
};

type IzinDesktop = NotificationPermission | "tidak-didukung";

type Konteks = {
  aktif: boolean;
  jumlah: number;
  suara: boolean;
  setSuara: (nilai: boolean) => void;
  izinDesktop: IzinDesktop;
  aktifkanDesktop: () => void;
};

const KonteksNotifikasi = createContext<Konteks>({
  aktif: false,
  jumlah: 0,
  suara: true,
  setSuara: () => {},
  izinDesktop: "tidak-didukung",
  aktifkanDesktop: () => {},
});

export function useNotifikasiRujukan() {
  return useContext(KonteksNotifikasi);
}

// ---------- bunyi & notifikasi browser ----------

let ctxAudio: AudioContext | null = null;

function ambilAudio(): AudioContext | null {
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctxAudio = ctxAudio ?? new AC();
    return ctxAudio;
  } catch {
    return null;
  }
}

// Browser memblokir suara sebelum ada interaksi. Interaksi pertama (klik/tombol)
// "membuka kunci" audio supaya bunyi notifikasi bisa jalan setelahnya.
function bukaKunciAudio() {
  const ctx = ambilAudio();
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
}

function bunyi() {
  const ctx = ambilAudio();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const mulai = ctx.currentTime;
    for (const [frekuensi, tunda] of [
      [880, 0],
      [1175, 0.2],
    ]) {
      const osilator = ctx.createOscillator();
      const gain = ctx.createGain();
      osilator.type = "sine";
      osilator.frequency.value = frekuensi;
      gain.gain.setValueAtTime(0.0001, mulai + tunda);
      gain.gain.exponentialRampToValueAtTime(0.25, mulai + tunda + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, mulai + tunda + 0.32);
      osilator.connect(gain);
      gain.connect(ctx.destination);
      osilator.start(mulai + tunda);
      osilator.stop(mulai + tunda + 0.35);
    }
  } catch {
    // Suara cuma pelengkap, abaikan kalau gagal.
  }
}

function notifikasiBrowser(judul: string, isi: string, tag: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  // Kalau tab sedang dilihat, toast di layar sudah cukup.
  if (document.visibilityState === "visible") return;
  try {
    const n = new Notification(judul, { body: isi, tag });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // Beberapa browser mobile melarang konstruktor Notification, abaikan.
  }
}

// ---------- provider ----------

export function ProviderNotifikasiRujukan({
  aktif,
  lokasiId,
  children,
}: {
  aktif: boolean;
  lokasiId: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const [jumlah, setJumlah] = useState(0);
  const [toast, setToast] = useState<Toast[]>([]);
  const [suara, setSuaraState] = useState(true);
  const [izinDesktop, setIzinDesktop] = useState<IzinDesktop>("tidak-didukung");

  // null = sinkron pertama belum selesai (dipakai supaya rujukan yang sudah
  // menunggu saat login cuma jadi satu toast ringkasan, bukan banjir toast).
  const dikenal = useRef<Set<string> | null>(null);
  const urutan = useRef(0);
  const suaraRef = useRef(suara);
  const pathRef = useRef(pathname);
  suaraRef.current = suara;
  pathRef.current = pathname;

  const bolehNotif = aktif && !!lokasiId;

  const setSuara = useCallback((nilai: boolean) => {
    setSuaraState(nilai);
    try {
      window.localStorage.setItem(KUNCI_SUARA, nilai ? "1" : "0");
    } catch {
      // localStorage bisa diblokir, preferensi cuma berlaku sampai halaman dimuat ulang.
    }
  }, []);

  const aktifkanDesktop = useCallback(() => {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission()
      .then((hasil) => setIzinDesktop(hasil))
      .catch(() => {});
  }, []);

  const tutupToast = useCallback((kunci: string) => {
    setToast((t) => t.filter((x) => x.kunci !== kunci));
  }, []);

  const sinkron = useCallback(async () => {
    if (!lokasiId) return;
    const nomor = ++urutan.current;

    const { data, count, error } = await supabase
      .from("rujukan")
      .select("id, diagnosis, alasan, pasien:pasien_id (no_rm, nama_lengkap), dari:dari_lokasi_id (nama)", {
        count: "exact",
      })
      .eq("jenis", "internal")
      .eq("ke_lokasi_id", lokasiId)
      .eq("status", "dibuat")
      .order("dibuat_pada", { ascending: false })
      .limit(50);

    // Ada sinkron yang lebih baru sudah jalan: buang hasil lama ini.
    if (nomor !== urutan.current) return;
    if (error || !data) return;

    const terbaru: ItemRujukan[] = data.map((r) => {
      const pasien = r.pasien as unknown as { no_rm: string; nama_lengkap: string } | null;
      const dari = r.dari as unknown as { nama: string } | null;
      const ringkas = (r.diagnosis?.trim() || r.alasan || "").slice(0, 90);
      return {
        id: r.id,
        namaPasien: pasien?.nama_lengkap ?? "Pasien",
        noRm: pasien?.no_rm ?? "—",
        asal: dari?.nama ?? "lokasi lain",
        ringkas,
      };
    });

    const total = count ?? terbaru.length;
    const idSekarang = new Set(terbaru.map((i) => i.id));
    setJumlah(total);

    if (dikenal.current === null) {
      dikenal.current = idSekarang;
      if (total > 0) {
        setToast((t) => [
          {
            kunci: "ringkasan",
            judul: "Rujukan menunggu",
            isi: `${total} rujukan masuk belum diterima.`,
          },
          ...t.filter((x) => x.kunci !== "ringkasan"),
        ]);
        if (suaraRef.current) bunyi();
      }
    } else {
      const baru = terbaru.filter((i) => !dikenal.current!.has(i.id));
      dikenal.current = idSekarang;
      if (baru.length > 0) {
        setToast((t) => [
          ...baru.map((i) => ({
            kunci: i.id,
            rujukanId: i.id,
            judul: `Rujukan baru dari ${i.asal}`,
            isi: `${i.namaPasien} (RM ${i.noRm})${i.ringkas ? ` — ${i.ringkas}` : ""}`,
          })),
          ...t,
        ]);
        if (suaraRef.current) bunyi();
        const pertama = baru[0];
        notifikasiBrowser(
          `Rujukan baru dari ${pertama.asal}`,
          baru.length > 1 ? `${baru.length} rujukan baru masuk.` : `${pertama.namaPasien} (RM ${pertama.noRm})`,
          pertama.id
        );
      }
    }

    // Rujukan yang sudah diterima/dibatalkan petugas lain: toast-nya ikut hilang.
    setToast((t) =>
      t.filter((x) => (x.rujukanId ? idSekarang.has(x.rujukanId) : x.kunci !== "ringkasan" || idSekarang.size > 0))
    );
  }, [lokasiId, supabase]);

  // Preferensi suara + status izin notifikasi browser.
  useEffect(() => {
    if (!bolehNotif) return;
    try {
      if (window.localStorage.getItem(KUNCI_SUARA) === "0") setSuaraState(false);
    } catch {
      // abaikan
    }
    setIzinDesktop(typeof Notification === "undefined" ? "tidak-didukung" : Notification.permission);

    window.addEventListener("pointerdown", bukaKunciAudio, { once: true });
    window.addEventListener("keydown", bukaKunciAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", bukaKunciAudio);
      window.removeEventListener("keydown", bukaKunciAudio);
    };
  }, [bolehNotif]);

  // Realtime + polling cadangan.
  useEffect(() => {
    if (!bolehNotif || !lokasiId) return;

    let batal = false;
    let kanal: ReturnType<typeof supabase.channel> | null = null;

    async function mulai() {
      // Pastikan Realtime memakai token login (bukan anon), supaya RLS berlaku.
      const { data } = await supabase.auth.getSession();
      if (batal) return;
      if (data.session) supabase.realtime.setAuth(data.session.access_token);

      await sinkron();
      if (batal) return;

      kanal = supabase
        .channel(`rujukan-masuk-${lokasiId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rujukan", filter: `ke_lokasi_id=eq.${lokasiId}` },
          () => {
            sinkron();
            // Lagi membuka daftar rujukan: tabelnya ikut diperbarui.
            if (pathRef.current.startsWith("/dashboard/rujukan")) router.refresh();
          }
        )
        .subscribe();
    }

    mulai();

    const poll = setInterval(sinkron, JEDA_POLLING_MS);
    const saatKembali = () => {
      if (document.visibilityState === "visible") sinkron();
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
  }, [bolehNotif, lokasiId, sinkron, supabase, router]);

  // Jumlah belum diterima di judul tab, mis. "(2) SIMPUS - ...".
  useEffect(() => {
    if (!bolehNotif) return;
    const dasar = document.title.replace(/^\(\d+\+?\)\s/, "");
    document.title = jumlah > 0 ? `(${jumlah}) ${dasar}` : dasar;
  }, [bolehNotif, jumlah, pathname]);

  const nilai = useMemo<Konteks>(
    () => ({ aktif: bolehNotif, jumlah, suara, setSuara, izinDesktop, aktifkanDesktop }),
    [bolehNotif, jumlah, suara, setSuara, izinDesktop, aktifkanDesktop]
  );

  const tampil = toast.slice(0, MAKS_TOAST_TAMPIL);
  const sisa = toast.length - tampil.length;

  return (
    <KonteksNotifikasi.Provider value={nilai}>
      {children}

      {bolehNotif && toast.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-6 top-6 z-50 flex w-[360px] max-w-[calc(100vw-3rem)] flex-col gap-3 print:hidden"
        >
          {tampil.map((t) => (
            <div key={t.kunci} className="rounded-card border border-clay-600/40 bg-white p-4 shadow-lg">
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
                href="/dashboard/rujukan?tab=masuk"
                onClick={() => tutupToast(t.kunci)}
                className="mt-3 inline-block rounded-sm bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-900"
              >
                Lihat rujukan
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
    </KonteksNotifikasi.Provider>
  );
}

// Pengaturan kecil di sidebar: bunyi + izin notifikasi browser.
export function KontrolNotifikasiRujukan() {
  const { aktif, suara, setSuara, izinDesktop, aktifkanDesktop } = useNotifikasiRujukan();
  if (!aktif) return null;

  return (
    <div className="mt-6 rounded-xl border border-white/15 bg-white/5 px-3.5 py-3 text-xs text-white/70">
      <p className="font-semibold text-white/85">Notifikasi rujukan masuk</p>
      <label className="mt-2 flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={suara}
          onChange={(e) => setSuara(e.target.checked)}
          className="h-3.5 w-3.5 accent-teal-500"
        />
        Bunyi saat rujukan masuk
      </label>
      {izinDesktop === "default" && (
        <button type="button" onClick={aktifkanDesktop} className="mt-2 text-left underline underline-offset-2">
          Aktifkan notifikasi browser
        </button>
      )}
      {izinDesktop === "granted" && <p className="mt-2 text-white/55">Notifikasi browser aktif.</p>}
      {izinDesktop === "denied" && (
        <p className="mt-2 text-white/55">Notifikasi browser diblokir. Ubah di pengaturan situs browser.</p>
      )}
    </div>
  );
}
