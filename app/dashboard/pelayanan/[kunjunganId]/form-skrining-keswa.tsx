"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { batalkanSkriningKeswaAction, catatSkriningKeswaAction } from "./actions";

const SOAL_SRQ20: { nomor: number; teks: string }[] = [
  { nomor: 1, teks: "Apakah anda sering menderita sakit kepala?" },
  { nomor: 2, teks: "Apakah nafsu makan anda buruk?" },
  { nomor: 3, teks: "Apakah tidur anda tidak lelap?" },
  { nomor: 4, teks: "Apakah anda mudah takut?" },
  { nomor: 5, teks: "Apakah anda merasa cemas, tegang, atau khawatir?" },
  { nomor: 6, teks: "Apakah tangan anda gemetar?" },
  { nomor: 7, teks: "Apakah anda mengalami gangguan pencernaan?" },
  { nomor: 8, teks: "Apakah anda merasa sulit berpikir jernih?" },
  { nomor: 9, teks: "Apakah anda merasa tidak bahagia?" },
  { nomor: 10, teks: "Apakah anda lebih sering menangis?" },
  { nomor: 11, teks: "Apakah anda merasa sulit menikmati aktivitas sehari-hari?" },
  { nomor: 12, teks: "Apakah anda mengalami kesulitan mengambil keputusan?" },
  { nomor: 13, teks: "Apakah aktivitas/tugas sehari-hari anda terbengkalai?" },
  { nomor: 14, teks: "Apakah anda merasa tidak mampu berperan dalam kehidupan ini?" },
  { nomor: 15, teks: "Apakah anda kehilangan minat terhadap banyak hal?" },
  { nomor: 16, teks: "Apakah anda merasa tidak berharga?" },
  { nomor: 17, teks: "Apakah anda mempunyai pikiran untuk mengakhiri hidup anda?" },
  { nomor: 18, teks: "Apakah anda merasa lelah sepanjang waktu?" },
  { nomor: 19, teks: "Apakah anda mengalami rasa tidak enak di perut?" },
  { nomor: 20, teks: "Apakah anda mudah lelah?" },
];

const SOAL_BUNUH_DIRI = 17;
const AMBANG_SKOR_TERINDIKASI = 6;

const labelCls = "text-sm font-bold text-ink/80";
const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";

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
      {pending ? "Menyimpan..." : "Simpan Skrining Jiwa"}
    </button>
  );
}

function BadgeKategori({ kategori }: { kategori: string }) {
  const terindikasi = kategori === "terindikasi_masalah_emosional";
  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
        terindikasi ? "bg-clay-600/10 text-clay-700" : "bg-teal-700/10 text-teal-700"
      }`}
    >
      {terindikasi ? "Terindikasi Masalah Emosional" : "Tidak Terindikasi"}
    </span>
  );
}

export type SkriningKeswaTercatat = {
  id: string;
  jawaban_ya: number[];
  skor: number;
  kategori: string;
  tindak_lanjut: string | null;
  dicatat_pada: string;
};

export default function FormSkriningKeswa({
  kunjunganId,
  daftarSkrining,
}: {
  kunjunganId: string;
  daftarSkrining: SkriningKeswaTercatat[];
}) {
  const [state, formAction] = useFormState(catatSkriningKeswaAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [dijawabYa, setDijawabYa] = useState<Set<number>>(new Set());

  const skorSementara = dijawabYa.size;
  const terindikasiSementara = useMemo(
    () => skorSementara >= AMBANG_SKOR_TERINDIKASI || dijawabYa.has(SOAL_BUNUH_DIRI),
    [skorSementara, dijawabYa]
  );

  useEffect(() => {
    if (state?.sukses) {
      formRef.current?.reset();
      setDijawabYa(new Set());
    }
  }, [state]);

  function toggleSoal(nomor: number, dicentang: boolean) {
    setDijawabYa((sebelum) => {
      const baru = new Set(sebelum);
      if (dicentang) baru.add(nomor);
      else baru.delete(nomor);
      return baru;
    });
  }

  return (
    <div className="space-y-5">
      <form ref={formRef} action={formAction} className="space-y-4">
        <input type="hidden" name="kunjungan_id" value={kunjunganId} />

        <p className="text-xs text-ink/50">
          SRQ-20 (Self Reporting Questionnaire) — tanyakan tiap soal ke pasien, jawaban 30 hari terakhir. Centang kalau
          jawabannya "Ya".
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SOAL_SRQ20.map((soal) => (
            <label
              key={soal.nomor}
              className={`flex items-start gap-2.5 rounded-sm border px-3.5 py-2.5 text-sm ${
                soal.nomor === SOAL_BUNUH_DIRI ? "border-clay-600/30 bg-clay-600/5" : "border-sand-100 bg-[#FBFDFF]"
              }`}
            >
              <input
                type="checkbox"
                name={`jiwa_q${soal.nomor}`}
                value="ya"
                className="mt-0.5"
                onChange={(e) => toggleSoal(soal.nomor, e.target.checked)}
              />
              <span className="text-ink/80">
                <span className="mr-1 font-semibold text-ink/50">{soal.nomor}.</span>
                {soal.teks}
              </span>
            </label>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-sm border border-sand-100 bg-sand-50 px-4 py-3">
          <p className="text-sm font-bold text-ink">
            Skor sementara: <span className="text-teal-700">{skorSementara} / 20</span>
          </p>
          <BadgeKategori kategori={terindikasiSementara ? "terindikasi_masalah_emosional" : "tidak_terindikasi"} />
          {dijawabYa.has(SOAL_BUNUH_DIRI) && (
            <p className="text-xs font-semibold text-clay-700">
              Ada jawaban "Ya" pada soal risiko bunuh diri (No. 17) — pertimbangkan rujukan segera.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="keswa_catatan" className={labelCls}>
              Catatan
            </label>
            <textarea id="keswa_catatan" name="catatan" rows={2} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="keswa_tindak_lanjut" className={labelCls}>
              Tindak lanjut
            </label>
            <textarea
              id="keswa_tindak_lanjut"
              name="tindak_lanjut"
              rows={2}
              placeholder="contoh: Edukasi, konseling, atau rujuk ke layanan kesehatan jiwa"
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
        <p className="mb-2 text-sm font-bold text-ink">Riwayat Skrining Jiwa Kunjungan Ini</p>
        <div className="space-y-2">
          {daftarSkrining.map((s) => (
            <div key={s.id} className="rounded-sm border border-sand-100 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">
                  Skor {s.skor}/20 · {waktuWib(s.dicatat_pada)}
                </p>
                <div className="flex items-center gap-2">
                  <BadgeKategori kategori={s.kategori} />
                  <button
                    onClick={() => batalkanSkriningKeswaAction(s.id, kunjunganId)}
                    className="text-xs font-medium text-clay-700 underline decoration-clay-700/30 underline-offset-2"
                  >
                    Batalkan
                  </button>
                </div>
              </div>
              {s.tindak_lanjut && <p className="mt-1 text-xs text-ink/50">Tindak lanjut: {s.tindak_lanjut}</p>}
            </div>
          ))}
          {daftarSkrining.length === 0 && (
            <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/45">
              Belum ada skrining jiwa tercatat.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
