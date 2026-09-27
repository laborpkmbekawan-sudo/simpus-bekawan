"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { tambahJadwalPosbinduLansiaAction, ubahStatusJadwalAction } from "./actions";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";
const labelCls = "text-sm font-bold text-ink/80";

const LABEL_JENIS: Record<string, string> = { posbindu_ptm: "Posbindu PTM", posyandu_lansia: "Posyandu Lansia" };
const LABEL_STATUS: Record<string, string> = { terjadwal: "Terjadwal", selesai: "Selesai", dibatalkan: "Dibatalkan" };
const WARNA_STATUS: Record<string, string> = {
  terjadwal: "bg-clay-600/10 text-clay-700",
  selesai: "bg-teal-700/10 text-teal-700",
  dibatalkan: "bg-ink/10 text-ink/50",
};

export type PosyanduOpsi = { id: string; nama: string; lokasiNama: string };
export type PegawaiOpsi = { id: string; nama: string };
export type BarisJadwal = {
  id: string;
  jenisKegiatan: string;
  tanggalPelaksanaan: string;
  jamMulai: string | null;
  status: string;
  catatan: string | null;
  namaPosyandu: string;
  lokasiNama: string;
  namaPenanggungJawab: string | null;
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
      {pending ? "Menyimpan..." : "Simpan Jadwal"}
    </button>
  );
}

function tanggalPanjang(tanggal: string) {
  return new Date(`${tanggal}T00:00:00Z`).toLocaleDateString("id-ID", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function TabelJadwal({
  posyanduOpsi,
  pegawaiOpsi,
  jadwal,
}: {
  posyanduOpsi: PosyanduOpsi[];
  pegawaiOpsi: PegawaiOpsi[];
  jadwal: BarisJadwal[];
}) {
  const [state, formAction] = useFormState(tambahJadwalPosbinduLansiaAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [filterLokasi, setFilterLokasi] = useState("semua");

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  const daftarLokasi = useMemo(() => {
    const set = new Set(posyanduOpsi.map((p) => p.lokasiNama));
    return Array.from(set);
  }, [posyanduOpsi]);

  const jadwalTersaring = useMemo(
    () => (filterLokasi === "semua" ? jadwal : jadwal.filter((j) => j.lokasiNama === filterLokasi)),
    [jadwal, filterLokasi]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-card border border-sand-100 bg-white p-5">
        <h2 className="mb-4 text-base font-bold text-ink">Tambah Jadwal</h2>
        <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="jw_posyandu" className={labelCls}>Lokasi / Posyandu</label>
            <select id="jw_posyandu" name="posyandu_id" required defaultValue="" className={inputCls}>
              <option value="" disabled>Pilih posyandu...</option>
              {posyanduOpsi.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lokasiNama} — {p.nama}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="jw_jenis" className={labelCls}>Jenis kegiatan</label>
            <select id="jw_jenis" name="jenis_kegiatan" defaultValue="posbindu_ptm" className={inputCls}>
              {Object.entries(LABEL_JENIS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="jw_tanggal" className={labelCls}>Tanggal pelaksanaan</label>
            <input id="jw_tanggal" name="tanggal_pelaksanaan" type="date" required className={inputCls} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="jw_jam" className={labelCls}>Jam mulai</label>
            <input id="jw_jam" name="jam_mulai" type="time" className={inputCls} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="jw_pj" className={labelCls}>Penanggung jawab</label>
            <select id="jw_pj" name="penanggung_jawab_id" defaultValue="" className={inputCls}>
              <option value="">— Belum ditentukan —</option>
              {pegawaiOpsi.map((p) => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-3">
            <label htmlFor="jw_catatan" className={labelCls}>Catatan</label>
            <input id="jw_catatan" name="catatan" placeholder="contoh: Bawa alat cek gula darah cadangan" className={inputCls} />
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
      </section>

      <section className="rounded-card border border-sand-100 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-ink">Daftar Jadwal</h2>
          <select
            value={filterLokasi}
            onChange={(e) => setFilterLokasi(e.target.value)}
            className="rounded-sm border border-sand-100 bg-[#FBFDFF] px-3 py-2 text-sm"
          >
            <option value="semua">Semua Lokasi</option>
            {daftarLokasi.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-card border border-sand-100">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-100 text-xs uppercase tracking-wide text-ink/45">
                <th className="px-4 py-2.5 font-medium">Tanggal</th>
                <th className="px-4 py-2.5 font-medium">Lokasi / Posyandu</th>
                <th className="px-4 py-2.5 font-medium">Kegiatan</th>
                <th className="px-4 py-2.5 font-medium">PJ</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {jadwalTersaring.map((j) => (
                <tr key={j.id} className="border-b border-sand-100/70 last:border-0">
                  <td className="px-4 py-2.5 text-ink/70">
                    {tanggalPanjang(j.tanggalPelaksanaan)}
                    {j.jamMulai ? ` · ${j.jamMulai.slice(0, 5)}` : ""}
                  </td>
                  <td className="px-4 py-2.5 text-ink/70">{j.lokasiNama} — {j.namaPosyandu}</td>
                  <td className="px-4 py-2.5 text-ink/70">{LABEL_JENIS[j.jenisKegiatan]}</td>
                  <td className="px-4 py-2.5 text-ink/70">{j.namaPenanggungJawab ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-sm px-2 py-0.5 text-xs font-medium ${WARNA_STATUS[j.status]}`}>
                      {LABEL_STATUS[j.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {j.status === "terjadwal" && (
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => ubahStatusJadwalAction(j.id, "selesai")}
                          className="text-xs font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2"
                        >
                          Tandai Selesai
                        </button>
                        <button
                          onClick={() => ubahStatusJadwalAction(j.id, "dibatalkan")}
                          className="text-xs font-medium text-clay-700 underline decoration-clay-700/30 underline-offset-2"
                        >
                          Batalkan
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {jadwalTersaring.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-ink/45">
                    Belum ada jadwal tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
