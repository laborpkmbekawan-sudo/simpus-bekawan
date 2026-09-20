"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { buatRujukanAction } from "./actions";

type Lokasi = { id: string; nama: string; tipe: string };

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-clay-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-clay-700 disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Rujukan"}
    </button>
  );
}

export default function FormRujukan({
  semuaLokasi,
  lokasiSaya,
  admin,
  saranTujuan,
  noRmAwal,
}: {
  semuaLokasi: Lokasi[];
  lokasiSaya: Lokasi | null;
  admin: boolean;
  saranTujuan: string[];
  noRmAwal: string;
}) {
  const [state, formAction] = useFormState(buatRujukanAction, null);
  const [jenis, setJenis] = useState<"internal" | "eksternal">("eksternal");
  const [dariAdmin, setDariAdmin] = useState(semuaLokasi[0]?.id ?? "");
  const [penjamin, setPenjamin] = useState<"umum" | "bpjs">("umum");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sukses) {
      formRef.current?.reset();
      setJenis("eksternal");
      setPenjamin("umum");
    }
  }, [state]);

  if (!admin && !lokasiSaya) {
    return (
      <p className="rounded-sm bg-sand-50 px-4 py-4 text-sm text-ink/60">
        Akunmu belum punya lokasi kerja (Puskesmas Induk / Pustu), jadi belum bisa membuat rujukan. Minta admin mengisinya di Data Pegawai.
      </p>
    );
  }

  const dariId = admin ? dariAdmin : lokasiSaya!.id;
  // Dari Pustu: pasien punya No. RM sendiri, identitasnya diisi manual.
  // Dari Induk: pasien dicari lewat No. RM Induk.
  const manual = semuaLokasi.find((l) => l.id === dariId)?.tipe === "pustu";
  const tujuanInternal = semuaLokasi.filter((l) => l.id !== dariId);
  const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className={`grid grid-cols-1 gap-4 ${manual ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
        {!manual && (
          <div className="space-y-1.5">
            <label htmlFor="no_rm" className="text-sm font-bold text-ink/80">No. RM pasien</label>
            <input id="no_rm" name="no_rm" defaultValue={noRmAwal} placeholder="contoh: 00012" className={inputCls} />
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="dari_lokasi" className="text-sm font-bold text-ink/80">Dirujuk dari</label>
          {admin ? (
            <select
              id="dari_lokasi"
              name="dari_lokasi_id"
              value={dariAdmin}
              onChange={(e) => setDariAdmin(e.target.value)}
              className={inputCls}
            >
              {semuaLokasi.map((l) => (
                <option key={l.id} value={l.id}>{l.nama}</option>
              ))}
            </select>
          ) : (
            <input id="dari_lokasi" value={lokasiSaya!.nama} readOnly className={`${inputCls} bg-sand-50 text-ink/70`} />
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="jenis" className="text-sm font-bold text-ink/80">Tujuan rujukan</label>
          <select
            id="jenis"
            name="jenis"
            value={jenis}
            onChange={(e) => setJenis(e.target.value as "internal" | "eksternal")}
            className={inputCls}
          >
            <option value="eksternal">Rumah sakit / faskes lain</option>
            <option value="internal">Puskesmas Induk / Pustu</option>
          </select>
        </div>
      </div>

      {manual && (
        <fieldset className="space-y-4 rounded-sm border border-sand-100 bg-sand-50/60 p-4">
          <legend className="px-1 text-sm font-bold text-ink/80">Data pasien</legend>
          <p className="text-xs text-ink/55">
            Pasien Pustu memakai No. RM Pustu sendiri dan tidak perlu terdaftar di Puskesmas Induk. Isi identitasnya di sini.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="pasien_no_rm_asal" className="text-sm font-bold text-ink/80">No. RM di Pustu</label>
              <input id="pasien_no_rm_asal" name="pasien_no_rm_asal" className={inputCls} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="pasien_nama" className="text-sm font-bold text-ink/80">Nama lengkap</label>
              <input id="pasien_nama" name="pasien_nama" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="pasien_jenis_kelamin" className="text-sm font-bold text-ink/80">Jenis kelamin</label>
              <select id="pasien_jenis_kelamin" name="pasien_jenis_kelamin" defaultValue="" className={inputCls}>
                <option value="">—</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pasien_tanggal_lahir" className="text-sm font-bold text-ink/80">Tanggal lahir</label>
              <input id="pasien_tanggal_lahir" name="pasien_tanggal_lahir" type="date" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pasien_nik" className="text-sm font-bold text-ink/80">NIK (opsional)</label>
              <input id="pasien_nik" name="pasien_nik" inputMode="numeric" className={inputCls} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pasien_alamat" className="text-sm font-bold text-ink/80">Alamat (opsional)</label>
            <input id="pasien_alamat" name="pasien_alamat" placeholder="jalan, RT/RW, desa" className={inputCls} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="pasien_jenis_penjamin" className="text-sm font-bold text-ink/80">Penjamin</label>
              <select
                id="pasien_jenis_penjamin"
                name="pasien_jenis_penjamin"
                value={penjamin}
                onChange={(e) => setPenjamin(e.target.value as "umum" | "bpjs")}
                className={inputCls}
              >
                <option value="umum">Umum</option>
                <option value="bpjs">BPJS</option>
              </select>
            </div>
            {penjamin === "bpjs" && (
              <div className="space-y-1.5">
                <label htmlFor="pasien_no_bpjs" className="text-sm font-bold text-ink/80">No. BPJS (opsional)</label>
                <input id="pasien_no_bpjs" name="pasien_no_bpjs" inputMode="numeric" className={inputCls} />
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="pasien_alergi" className="text-sm font-bold text-ink/80">Alergi (opsional)</label>
              <input id="pasien_alergi" name="pasien_alergi" className={inputCls} />
            </div>
          </div>
        </fieldset>
      )}

      {jenis === "internal" ? (
        <div className="space-y-1.5">
          <label htmlFor="ke_lokasi_id" className="text-sm font-bold text-ink/80">Lokasi tujuan</label>
          <select id="ke_lokasi_id" name="ke_lokasi_id" className={inputCls} defaultValue="">
            <option value="">Pilih lokasi tujuan...</option>
            {tujuanInternal.map((l) => (
              <option key={l.id} value={l.id}>{l.nama}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="tujuan_eksternal" className="text-sm font-bold text-ink/80">Rumah sakit / fasilitas tujuan</label>
            <input
              id="tujuan_eksternal"
              name="tujuan_eksternal"
              list="saran-tujuan"
              placeholder="ketik nama rumah sakit"
              className={inputCls}
            />
            <datalist id="saran-tujuan">
              {saranTujuan.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="poli_tujuan" className="text-sm font-bold text-ink/80">Poli / spesialis tujuan (opsional)</label>
            <input id="poli_tujuan" name="poli_tujuan" placeholder="contoh: Penyakit Dalam" className={inputCls} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="diagnosis" className="text-sm font-bold text-ink/80">Diagnosis</label>
          <input id="diagnosis" name="diagnosis" className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="alasan" className="text-sm font-bold text-ink/80">Alasan rujukan</label>
          <input
            id="alasan"
            name="alasan"
            placeholder="contoh: butuh pemeriksaan penunjang / fasilitas tidak tersedia"
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
  );
}
