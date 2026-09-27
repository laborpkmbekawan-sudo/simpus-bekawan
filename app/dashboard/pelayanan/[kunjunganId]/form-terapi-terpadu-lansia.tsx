"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { batalkanTerapiTerpaduLansiaAction, catatTerapiTerpaduLansiaAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

const LABEL_TERAPI: Record<string, string> = {
  fisioterapi: "Fisioterapi",
  terapi_okupasi: "Terapi Okupasi",
  terapi_kognitif: "Terapi Kognitif",
  senam_lansia: "Senam Lansia",
  terapi_kelompok: "Terapi Kelompok",
  lainnya: "Lainnya",
};

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Terapi"}
    </button>
  );
}

export type TerapiTerpaduLansiaTercatat = {
  id: string;
  jenis_terapi: string;
  kondisi_yang_ditangani: string | null;
  tindak_lanjut: string | null;
  dicatat_pada: string;
};

function waktuWib(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });
}

export default function FormTerapiTerpaduLansia({
  kunjunganId,
  daftarTerapi,
}: {
  kunjunganId: string;
  daftarTerapi: TerapiTerpaduLansiaTercatat[];
}) {
  const [state, formAction] = useFormState(catatTerapiTerpaduLansiaAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-5">
      <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <input type="hidden" name="kunjungan_id" value={kunjunganId} />

        <div className="space-y-1.5">
          <label htmlFor="ttl_jenis" className={labelCls}>Jenis terapi</label>
          <select id="ttl_jenis" name="jenis_terapi" defaultValue="fisioterapi" className={inputCls}>
            {Object.entries(LABEL_TERAPI).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="ttl_kondisi" className={labelCls}>Kondisi yang ditangani</label>
          <input id="ttl_kondisi" name="kondisi_yang_ditangani" className={inputCls} />
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor="ttl_evaluasi" className={labelCls}>Hasil evaluasi</label>
          <textarea id="ttl_evaluasi" name="hasil_evaluasi" rows={2} className={inputCls} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="ttl_rencana" className={labelCls}>Rencana lanjutan</label>
          <input id="ttl_rencana" name="rencana_lanjutan" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ttl_rujukan" className={labelCls}>Rujukan</label>
          <input id="ttl_rujukan" name="rujukan" className={inputCls} />
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <label htmlFor="ttl_tindaklanjut" className={labelCls}>Tindak lanjut</label>
          <input id="ttl_tindaklanjut" name="tindak_lanjut" className={inputCls} />
        </div>

        <div className="sm:col-span-3">
          {state?.pesan && (
            <p
              role="alert"
              className={`mb-3 rounded-sm px-3.5 py-2.5 text-sm ${
                state.sukses ? "bg-teal-500/10 text-teal-700" : "bg-clay-600/10 text-clay-700"
              }`}
            >
              {state.pesan}
            </p>
          )}
          <TombolSimpan />
        </div>
      </form>

      <div>
        <p className="mb-2 text-sm font-bold text-ink">Terapi Tercatat</p>
        <div className="space-y-2">
          {daftarTerapi.map((t) => (
            <div key={t.id} className="rounded-sm border border-sand-100 p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink">{LABEL_TERAPI[t.jenis_terapi] ?? t.jenis_terapi}</p>
                <button
                  onClick={() => batalkanTerapiTerpaduLansiaAction(t.id, kunjunganId)}
                  className="text-xs font-medium text-clay-700 underline decoration-clay-700/30 underline-offset-2"
                >
                  Batalkan
                </button>
              </div>
              <p className="mt-1 text-xs text-ink/50">
                {waktuWib(t.dicatat_pada)}
                {t.kondisi_yang_ditangani ? ` · ${t.kondisi_yang_ditangani}` : ""}
                {t.tindak_lanjut ? ` · ${t.tindak_lanjut}` : ""}
              </p>
            </div>
          ))}
          {daftarTerapi.length === 0 && (
            <p className="rounded-sm bg-sand-50 px-4 py-6 text-center text-sm text-ink/45">
              Belum ada terapi terpadu tercatat.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
