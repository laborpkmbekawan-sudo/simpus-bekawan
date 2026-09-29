"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { batalkanSkriningGeriatriAction, catatSkriningGeriatriAction } from "./actions";

const ADL_ITEM: { kode: string; label: string }[] = [
  { kode: "mandi", label: "Mandi sendiri tanpa bantuan" },
  { kode: "berpakaian", label: "Berpakaian sendiri (ambil & pakai baju)" },
  { kode: "ke_toilet", label: "Ke toilet sendiri (pergi, bersihkan diri, rapikan)" },
  { kode: "berpindah", label: "Berpindah tempat sendiri (tempat tidur ke kursi, dst.)" },
  { kode: "kontinensia", label: "Bisa mengendalikan BAB/BAK sendiri" },
  { kode: "makan", label: "Makan sendiri tanpa disuapi" },
];

// GDS-15 (Yesavage & Sheikh 1986). yaPositif = true berarti jawaban "Ya"
// bernilai 1 poin depresi; false berarti jawaban "Tidak" yang bernilai 1 poin.
const SOAL_GDS15: { nomor: number; teks: string; yaPositif: boolean }[] = [
  { nomor: 1, teks: "Apakah anda puas dengan kehidupan anda?", yaPositif: false },
  { nomor: 2, teks: "Apakah anda telah meninggalkan banyak kegiatan/minat anda?", yaPositif: true },
  { nomor: 3, teks: "Apakah anda merasa kehidupan anda kosong/hampa?", yaPositif: true },
  { nomor: 4, teks: "Apakah anda sering merasa bosan?", yaPositif: true },
  { nomor: 5, teks: "Apakah anda mempunyai semangat yang baik setiap saat?", yaPositif: false },
  { nomor: 6, teks: "Apakah anda takut sesuatu yang buruk akan terjadi pada anda?", yaPositif: true },
  { nomor: 7, teks: "Apakah anda merasa bahagia untuk sebagian besar hidup anda?", yaPositif: false },
  { nomor: 8, teks: "Apakah anda sering merasa tidak berdaya/putus asa?", yaPositif: true },
  { nomor: 9, teks: "Apakah anda lebih senang tinggal di rumah daripada pergi keluar?", yaPositif: true },
  { nomor: 10, teks: "Apakah anda merasa daya ingat anda lebih buruk dibanding orang lain?", yaPositif: true },
  { nomor: 11, teks: "Apakah anda pikir hidup anda sekarang ini menyenangkan?", yaPositif: false },
  { nomor: 12, teks: "Apakah anda merasa tidak berharga seperti perasaan anda saat ini?", yaPositif: true },
  { nomor: 13, teks: "Apakah anda merasa penuh semangat/energik?", yaPositif: false },
  { nomor: 14, teks: "Apakah anda merasa keadaan anda tidak ada harapan?", yaPositif: true },
  { nomor: 15, teks: "Apakah anda pikir orang lain lebih baik keadaannya daripada anda?", yaPositif: true },
];

const labelCls = "text-sm font-bold text-ink/80";
const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";

const LABEL_ADL_KATEGORI: Record<string, string> = {
  mandiri: "Mandiri",
  ketergantungan_ringan: "Ketergantungan Ringan",
  ketergantungan_sedang: "Ketergantungan Sedang",
  ketergantungan_berat: "Ketergantungan Berat",
};

const LABEL_GDS_KATEGORI: Record<string, string> = {
  normal: "Normal",
  depresi_ringan: "Depresi Ringan",
  depresi_sedang: "Depresi Sedang",
  depresi_berat: "Depresi Berat",
};

function kategoriAdl(skor: number) {
  if (skor === 6) return "mandiri";
  if (skor >= 4) return "ketergantungan_ringan";
  if (skor >= 2) return "ketergantungan_sedang";
  return "ketergantungan_berat";
}

function kategoriGds(skor: number) {
  if (skor <= 4) return "normal";
  if (skor <= 8) return "depresi_ringan";
  if (skor <= 11) return "depresi_sedang";
  return "depresi_berat";
}

function waktuWib(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Skrining Geriatri"}
    </button>
  );
}

function BadgeAdl({ kategori }: { kategori: string }) {
  const bermasalah = kategori !== "mandiri";
  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
        bermasalah ? "bg-clay-600/10 text-clay-700" : "bg-teal-700/10 text-teal-700"
      }`}
    >
      ADL: {LABEL_ADL_KATEGORI[kategori] ?? kategori}
    </span>
  );
}

function BadgeGds({ kategori }: { kategori: string }) {
  const bermasalah = kategori !== "normal";
  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
        bermasalah ? "bg-clay-600/10 text-clay-700" : "bg-teal-700/10 text-teal-700"
      }`}
    >
      GDS: {LABEL_GDS_KATEGORI[kategori] ?? kategori}
    </span>
  );
}

export type SkriningGeriatriTercatat = {
  id: string;
  adl_skor: number;
  adl_kategori: string;
  gds_skor: number;
  gds_kategori: string;
  tindak_lanjut: string | null;
  dicatat_pada: string;
};

export default function FormSkriningGeriatri({
  kunjunganId,
  daftarSkrining,
}: {
  kunjunganId: string;
  daftarSkrining: SkriningGeriatriTercatat[];
}) {
  const [state, formAction] = useFormState(catatSkriningGeriatriAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [adlMandiri, setAdlMandiri] = useState<Set<string>>(new Set());
  const [gdsJawabanYa, setGdsJawabanYa] = useState<Set<number>>(new Set());

  const skorAdlSementara = adlMandiri.size;
  const skorGdsSementara = useMemo(() => {
    let skor = 0;
    for (const soal of SOAL_GDS15) {
      const dijawabYa = gdsJawabanYa.has(soal.nomor);
      if (soal.yaPositif ? dijawabYa : !dijawabYa) skor += 1;
    }
    return skor;
  }, [gdsJawabanYa]);

  const kategoriAdlSementara = kategoriAdl(skorAdlSementara);
  const kategoriGdsSementara = kategoriGds(skorGdsSementara);

  useEffect(() => {
    if (state?.sukses) {
      formRef.current?.reset();
      setAdlMandiri(new Set());
      setGdsJawabanYa(new Set());
    }
  }, [state]);

  function toggleAdl(kode: string, mandiri: boolean) {
    setAdlMandiri((sebelum) => {
      const baru = new Set(sebelum);
      if (mandiri) baru.add(kode);
      else baru.delete(kode);
      return baru;
    });
  }

  function toggleGds(nomor: number, dijawabYa: boolean) {
    setGdsJawabanYa((sebelum) => {
      const baru = new Set(sebelum);
      if (dijawabYa) baru.add(nomor);
      else baru.delete(nomor);
      return baru;
    });
  }

  return (
    <div className="space-y-5">
      <form ref={formRef} action={formAction} className="space-y-5">
        <input type="hidden" name="kunjungan_id" value={kunjunganId} />

        <div className="space-y-2">
          <p className="text-xs text-ink/50">
            ADL (Indeks Katz) — centang kalau pasien bisa melakukan sendiri tanpa bantuan orang lain.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ADL_ITEM.map((item) => (
              <label
                key={item.kode}
                className="flex items-start gap-2.5 rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
              >
                <input
                  type="checkbox"
                  name={`adl_${item.kode}`}
                  value="mandiri"
                  className="mt-0.5"
                  onChange={(e) => toggleAdl(item.kode, e.target.checked)}
                />
                <span className="text-ink/80">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-ink/50">
            GDS-15 (Geriatric Depression Scale) — tanyakan tiap soal ke pasien. Centang kalau jawabannya "Ya".
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SOAL_GDS15.map((soal) => (
              <label
                key={soal.nomor}
                className="flex items-start gap-2.5 rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm"
              >
                <input
                  type="checkbox"
                  name={`gds_q${soal.nomor}`}
                  value="ya"
                  className="mt-0.5"
                  onChange={(e) => toggleGds(soal.nomor, e.target.checked)}
                />
                <span className="text-ink/80">
                  <span className="mr-1 font-semibold text-ink/50">{soal.nomor}.</span>
                  {soal.teks}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-sm border border-sand-100 bg-sand-50 px-4 py-3">
          <p className="text-sm font-bold text-ink">
            ADL: <span className="text-teal-700">{skorAdlSementara} / 6</span>
          </p>
          <BadgeAdl kategori={kategoriAdlSementara} />
          <p className="text-sm font-bold text-ink">
            GDS: <span className="text-teal-700">{skorGdsSementara} / 15</span>
          </p>
          <BadgeGds kategori={kategoriGdsSementara} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="geriatri_catatan" className={labelCls}>
              Catatan
            </label>
            <textarea id="geriatri_catatan" name="catatan" rows={2} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="geriatri_tindak_lanjut" className={labelCls}>
              Tindak lanjut
            </label>
            <textarea
              id="geriatri_tindak_lanjut"
              name="tindak_lanjut"
              rows={2}
              placeholder="contoh: Latihan ADL bertahap, rujuk ke layanan kesehatan jiwa/geriatri"
              className={inputCls}
            />
          </div>
        </div>

        {state?.pesan && (
          <p
            role="alert"
            className={`rounded-sm px-3.5 py-2.5 text-sm ${
              state.sukses ? "bg-teal-500/10 text-teal-700" : "bg-clay-600/10 text-clay-700"
            }`}
          >
            {state.pesan}
          </p>
        )}
        <TombolSimpan />
      </form>

      <div>
        <p className="mb-2 text-sm font-bold text-ink">Riwayat Skrining Geriatri Kunjungan Ini</p>
        <div className="space-y-2">
          {daftarSkrining.map((s) => (
            <div key={s.id} className="rounded-sm border border-sand-100 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{waktuWib(s.dicatat_pada)}</p>
                <div className="flex items-center gap-2">
                  <BadgeAdl kategori={s.adl_kategori} />
                  <BadgeGds kategori={s.gds_kategori} />
                  <button
                    onClick={() => batalkanSkriningGeriatriAction(s.id, kunjunganId)}
                    className="text-xs font-medium text-clay-700 underline decoration-clay-700/30 underline-offset-2"
                  >
                    Batalkan
                  </button>
                </div>
              </div>
              <p className="mt-1 text-xs text-ink/50">
                ADL {s.adl_skor}/6 · GDS {s.gds_skor}/15
                {s.tindak_lanjut ? ` · ${s.tindak_lanjut}` : ""}
              </p>
            </div>
          ))}
          {daftarSkrining.length === 0 && (
            <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/45">
              Belum ada skrining geriatri tercatat.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
