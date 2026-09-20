"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Notifikasi rujukan untuk tenaga klinis, dua arah:
//
// 1. MASUK: rujukan internal ke lokasi pegawai ini yang berstatus 'dibuat'
//    (belum diterima). Sumber kebenarannya tabel rujukan itu sendiri, jadi
//    pegawai yang baru login tetap melihat rujukan yang masuk saat offline.
//    Begitu satu petugas menekan Terima, rujukan hilang dari notifikasi semua
//    petugas lain di lokasi yang sama.
// 2. PEMBARUAN: rujukan internal yang DIBUAT dari lokasi pegawai ini dan
//    kini berstatus 'diterima' / 'selesai' di lokasi tujuan (mis. Pustu
//    diberi tahu rujukannya sudah diterima Induk). Yang sudah dilihat dicatat
//    per pegawai di tabel rujukan_status_dibaca; dianggap dilihat saat
//    tab Rujukan Keluar dibuka.
//
// Cara update: Supabase Realtime (instan) + polling 30 detik dan saat tab
// kembali fokus (cadangan kalau Realtime putus atau belum diaktifkan).

const JEDA_POLLING_MS = 30_000;
const KUNCI_SUARA = "simpus:notif-rujukan-suara";
const MAKS_TOAST_TAMPIL = 3;
const HARI_PEMBARUAN = 7; // pembaruan lebih lama dari ini tidak diberitakan lagi
const TAUTAN_MASUK = "/dashboard/rujukan?tab=masuk";
const TAUTAN_KELUAR = "/dashboard/rujukan?tab=keluar";

type ItemRujukan = {
  id: string;
  namaPasien: string;
  noRm: string;
  asal: string;
  ringkas: string;
};

type ItemPembaruan = {
  kunci: string; // "<id rujukan>:<status>"
  status: string;
  namaPasien: string;
  noRm: string;
  tujuan: string;
  tindakLanjut: string;
};

type Toast = {
  kunci: string;
  // masuk / pembaruan: satu rujukan. ringkasan-*: satu toast rangkuman saat login.
  asal: "masuk" | "pembaruan" | "ringkasan-masuk" | "ringkasan-pembaruan";
  kunciItem?: string;
  judul: string;
  isi: string;
  tautan: string;
};

type IzinDesktop = NotificationPermission | "tidak-didukung";

type Konteks = {
  aktif: boolean;
  jumlah: number; // rujukan masuk yang belum diterima
  jumlahPembaruan: number; // pembaruan rujukan keluar yang belum dilihat
  segarkan: () => void;
  suara: boolean;
  setSuara: (nilai: boolean) => void;
  izinDesktop: IzinDesktop;
  aktifkanDesktop: () => void;
};

const KonteksNotifikasi = createContext<Konteks>({
  aktif: false,
  jumlah: 0,
  jumlahPembaruan: 0,
  segarkan: () => {},
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
  const [jumlahPembaruan, setJumlahPembaruan] = useState(0);
  const [toast, setToast] = useState<Toast[]>([]);
  const [suara, setSuaraState] = useState(true);
  const [izinDesktop, setIzinDesktop] = useState<IzinDesktop>("tidak-didukung");

  // null = sinkron pertama belum selesai (dipakai supaya rujukan yang sudah
  // menunggu saat login cuma jadi satu toast ringkasan, bukan banjir toast).
  const dikenal = useRef<Set<string> | null>(null);
  const dikenalPembaruan = useRef<Set<string> | null>(null);
  const urutan = useRef(0);
  const suaraRef = useRef(suara);
  const pathRef = useRef(pathname);
  const routerRef = useRef(router);
  suaraRef.current = suara;
  pathRef.current = pathname;
  routerRef.current = router;

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
    const sejak = new Date(Date.now() - HARI_PEMBARUAN * 24 * 3600 * 1000).toISOString();

    const [masuk, keluar] = await Promise.all([
      supabase
        .from("rujukan")
        .select("id, diagnosis, alasan, pasien_nama, pasien_no_rm_asal, dari:dari_lokasi_id (nama)", {
          count: "exact",
        })
        .eq("jenis", "internal")
        .eq("ke_lokasi_id", lokasiId)
        .eq("status", "dibuat")
        .order("dibuat_pada", { ascending: false })
        .limit(50),
      supabase
        .from("rujukan")
        .select("id, status, catatan_tindak_lanjut, pasien_nama, pasien_no_rm_asal, ke:ke_lokasi_id (nama)")
        .eq("jenis", "internal")
        .eq("dari_lokasi_id", lokasiId)
        .in("status", ["diterima", "selesai"])
        .gte("diperbarui_pada", sejak)
        .order("diperbarui_pada", { ascending: false })
        .limit(50),
    ]);

    // Penanda "sudah dilihat" untuk rujukan keluar tadi (RLS: hanya milik sendiri).
    let sudahDilihat: Set<string> | null = new Set();
    const idKeluar = (keluar.data ?? []).map((r) => r.id);
    if (idKeluar.length > 0) {
      const { data: dibaca, error: galatDibaca } = await supabase
        .from("rujukan_status_dibaca")
        .select("rujukan_id, status")
        .in("rujukan_id", idKeluar);
      // Tabel belum dibuat (SQL tahap 7 belum dijalankan): fitur pembaruan dilewati,
      // notifikasi rujukan masuk tetap jalan.
      sudahDilihat = galatDibaca ? null : new Set((dibaca ?? []).map((d) => `${d.rujukan_id}:${d.status}`));
    }

    // Ada sinkron yang lebih baru sudah jalan: buang hasil lama ini.
    if (nomor !== urutan.current) return;
    if (masuk.error || !masuk.data) return;

    // ----- rujukan masuk -----
    const terbaru: ItemRujukan[] = masuk.data.map((r) => {
      const dari = r.dari as unknown as { nama: string } | null;
      const ringkas = (r.diagnosis?.trim() || r.alasan || "").slice(0, 90);
      return {
        id: r.id,
        namaPasien: r.pasien_nama ?? "Pasien",
        noRm: r.pasien_no_rm_asal ?? "—",
        asal: dari?.nama ?? "lokasi lain",
        ringkas,
      };
    });
    const totalMasuk = masuk.count ?? terbaru.length;
    const idSekarang = new Set(terbaru.map((i) => i.id));
    setJumlah(totalMasuk);

    // ----- pembaruan rujukan keluar (yang belum dilihat) -----
    const pembaruan: ItemPembaruan[] =
      keluar.error || !keluar.data || sudahDilihat === null
        ? []
        : keluar.data
            .filter((r) => !sudahDilihat!.has(`${r.id}:${r.status}`))
            .map((r) => {
              const ke = r.ke as unknown as { nama: string } | null;
              return {
                kunci: `${r.id}:${r.status}`,
                status: r.status,
                namaPasien: r.pasien_nama ?? "Pasien",
                noRm: r.pasien_no_rm_asal ?? "—",
                tujuan: ke?.nama ?? "lokasi tujuan",
                tindakLanjut: (r.catatan_tindak_lanjut ?? "").trim().slice(0, 90),
              };
            });
    const kunciPembaruanSekarang = new Set(pembaruan.map((p) => p.kunci));
    setJumlahPembaruan(pembaruan.length);

    // ----- toast, bunyi, notifikasi browser -----
    const toastBaru: Toast[] = [];
    const notifBrowser: { judul: string; isi: string; tag: string }[] = [];

    if (dikenal.current === null) {
      if (totalMasuk > 0) {
        toastBaru.push({
          kunci: "ringkasan-masuk",
          asal: "ringkasan-masuk",
          judul: "Rujukan menunggu",
          isi: `${totalMasuk} rujukan masuk belum diterima.`,
          tautan: TAUTAN_MASUK,
        });
      }
    } else {
      for (const i of terbaru.filter((x) => !dikenal.current!.has(x.id))) {
        const judul = `Rujukan baru dari ${i.asal}`;
        const isi = `${i.namaPasien} (RM ${i.noRm})${i.ringkas ? ` — ${i.ringkas}` : ""}`;
        toastBaru.push({ kunci: i.id, asal: "masuk", kunciItem: i.id, judul, isi, tautan: TAUTAN_MASUK });
        notifBrowser.push({ judul, isi, tag: i.id });
      }
    }
    dikenal.current = idSekarang;

    if (dikenalPembaruan.current === null) {
      if (pembaruan.length > 0) {
        toastBaru.push({
          kunci: "ringkasan-pembaruan",
          asal: "ringkasan-pembaruan",
          judul: "Pembaruan rujukan",
          isi: `${pembaruan.length} rujukan yang kamu kirim ada perkembangan baru.`,
          tautan: TAUTAN_KELUAR,
        });
      }
    } else {
      for (const p of pembaruan.filter((x) => !dikenalPembaruan.current!.has(x.kunci))) {
        const judul = p.status === "selesai" ? "Rujukan selesai ditangani" : "Rujukan diterima";
        const isi =
          p.status === "selesai"
            ? `${p.namaPasien} (RM ${p.noRm}) selesai di ${p.tujuan}.${p.tindakLanjut ? ` ${p.tindakLanjut}` : ""}`
            : `${p.namaPasien} (RM ${p.noRm}) sudah diterima di ${p.tujuan}.`;
        toastBaru.push({ kunci: p.kunci, asal: "pembaruan", kunciItem: p.kunci, judul, isi, tautan: TAUTAN_KELUAR });
        notifBrowser.push({ judul, isi, tag: p.kunci });
      }
    }
    dikenalPembaruan.current = kunciPembaruanSekarang;

    if (toastBaru.length > 0 && suaraRef.current) bunyi();
    if (notifBrowser.length === 1) {
      notifikasiBrowser(notifBrowser[0].judul, notifBrowser[0].isi, notifBrowser[0].tag);
    } else if (notifBrowser.length > 1) {
      notifikasiBrowser("Notifikasi rujukan", `${notifBrowser.length} pembaruan rujukan baru.`, "rujukan-banyak");
    }

    // Toast lama yang sudah tidak relevan (diterima petugas lain, sudah dilihat) ikut hilang.
    setToast((t) => {
      const sisa = t.filter((x) => {
        if (toastBaru.some((b) => b.kunci === x.kunci)) return false; // diganti versi baru
        if (x.asal === "masuk") return idSekarang.has(x.kunciItem!);
        if (x.asal === "pembaruan") return kunciPembaruanSekarang.has(x.kunciItem!);
        if (x.asal === "ringkasan-masuk") return idSekarang.size > 0;
        return kunciPembaruanSekarang.size > 0;
      });
      return [...toastBaru, ...sisa];
    });
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

    const saatBerubah = () => {
      sinkron();
      // Lagi membuka daftar rujukan: tabelnya ikut diperbarui.
      if (pathRef.current.startsWith("/dashboard/rujukan")) routerRef.current.refresh();
    };

    async function mulai() {
      // Pastikan Realtime memakai token login (bukan anon), supaya RLS berlaku.
      const { data } = await supabase.auth.getSession();
      if (batal) return;
      if (data.session) supabase.realtime.setAuth(data.session.access_token);

      await sinkron();
      if (batal) return;

      kanal = supabase
        .channel(`rujukan-${lokasiId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rujukan", filter: `ke_lokasi_id=eq.${lokasiId}` },
          saatBerubah
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rujukan", filter: `dari_lokasi_id=eq.${lokasiId}` },
          saatBerubah
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
  }, [bolehNotif, lokasiId, sinkron, supabase]);

  // Jumlah belum diterima di judul tab, mis. "(2) SIMPUS - ...".
  useEffect(() => {
    if (!bolehNotif) return;
    const dasar = document.title.replace(/^\(\d+\+?\)\s/, "");
    const total = jumlah + jumlahPembaruan;
    document.title = total > 0 ? `(${total}) ${dasar}` : dasar;
  }, [bolehNotif, jumlah, jumlahPembaruan, pathname]);

  const segarkan = useCallback(() => {
    sinkron();
  }, [sinkron]);

  const nilai = useMemo<Konteks>(
    () => ({
      aktif: bolehNotif,
      jumlah,
      jumlahPembaruan,
      segarkan,
      suara,
      setSuara,
      izinDesktop,
      aktifkanDesktop,
    }),
    [bolehNotif, jumlah, jumlahPembaruan, segarkan, suara, setSuara, izinDesktop, aktifkanDesktop]
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
                href={t.tautan}
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
      <p className="font-semibold text-white/85">Notifikasi rujukan</p>
      <label className="mt-2 flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={suara}
          onChange={(e) => setSuara(e.target.checked)}
          className="h-3.5 w-3.5 accent-teal-500"
        />
        Bunyi saat ada notifikasi
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
