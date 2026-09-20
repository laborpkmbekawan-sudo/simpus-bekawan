"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { buatTagihanTunaiAction, tandaiKlaimBpjsAction } from "../actions";

type Tarif = { id: string; nama_layanan: string; harga: number };
type ItemDipilih = { idBaris: string; tarifId: string; qty: number };

function formatRupiah(angka: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    angka
  );
}

function TombolBayar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Memproses..." : "Konfirmasi Bayar Tunai"}
    </button>
  );
}

export default function FormPembayaran({
  kunjunganId,
  shiftId,
  jenisPenjamin,
  daftarTarif,
  tindakanTercatat,
}: {
  kunjunganId: string;
  shiftId: string;
  jenisPenjamin: string;
  daftarTarif: Tarif[];
  tindakanTercatat: Tarif[];
}) {
  const [state, formAction] = useFormState(buatTagihanTunaiAction, null);
  // Prefill dari tindakan yang udah dicatat di rekam medis (checklist
  // tindakan) -- kasir tinggal cek/edit, gak perlu pilih dari nol lagi.
  const [baris, setBaris] = useState<ItemDipilih[]>(() =>
    tindakanTercatat.map((t) => ({ idBaris: crypto.randomUUID(), tarifId: t.id, qty: 1 }))
  );

  function tambahBaris() {
    setBaris((s) => [...s, { idBaris: crypto.randomUUID(), tarifId: daftarTarif[0]?.id ?? "", qty: 1 }]);
  }
  function hapusBaris(id: string) {
    setBaris((s) => s.filter((b) => b.idBaris !== id));
  }
  function ubahBaris(id: string, perubahan: Partial<ItemDipilih>) {
    setBaris((s) => s.map((b) => (b.idBaris === id ? { ...b, ...perubahan } : b)));
  }

  const itemUntukKirim = useMemo(
    () =>
      baris.map((b) => {
        const tarif = daftarTarif.find((t) => t.id === b.tarifId);
        return { nama: tarif?.nama_layanan ?? "", harga: tarif?.harga ?? 0, qty: b.qty };
      }),
    [baris, daftarTarif]
  );

  const total = itemUntukKirim.reduce((jumlah, i) => jumlah + i.harga * i.qty, 0);

  if (jenisPenjamin === "bpjs") {
    return (
      <div className="rounded-card border border-sand-100 bg-white p-6">
        <p className="text-center text-sm text-ink/60">
          Pasien ini pakai BPJS -- gak ada tagihan tunai, dicatat sebagai klaim.
        </p>

        {tindakanTercatat.length > 0 && (
          <div className="mt-4 rounded-sm border border-sand-100 bg-sand-50 p-3">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink/45">
              Tindakan tercatat (buat verifikasi klaim)
            </p>
            <ul className="space-y-1 text-sm text-ink">
              {tindakanTercatat.map((t, i) => (
                <li key={i}>• {t.nama_layanan}</li>
              ))}
            </ul>
          </div>
        )}

        <form action={tandaiKlaimBpjsAction} className="mt-4 text-center">
          <input type="hidden" name="kunjungan_id" value={kunjunganId} />
          <input type="hidden" name="shift_id" value={shiftId} />
          <button
            type="submit"
            className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900"
          >
            Tandai Klaim BPJS
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-card border border-sand-100 bg-white p-6">
      <input type="hidden" name="kunjungan_id" value={kunjunganId} />
      <input type="hidden" name="shift_id" value={shiftId} />
      <input type="hidden" name="jenis_penjamin" value={jenisPenjamin} />
      <input type="hidden" name="item_tagihan" value={JSON.stringify(itemUntukKirim)} />

      <div>
        <p className="text-sm font-bold text-ink">Pilih layanan yang dikenakan biaya</p>
        {tindakanTercatat.length > 0 && (
          <p className="mt-0.5 text-xs text-teal-700">
            {tindakanTercatat.length} layanan udah keisi otomatis dari tindakan di rekam medis -- cek/edit dulu sebelum bayar.
          </p>
        )}
      </div>

      <div className="space-y-2">
        {baris.map((b) => {
          const tarif = daftarTarif.find((t) => t.id === b.tarifId);
          return (
            <div key={b.idBaris} className="flex items-center gap-2">
              <select
                value={b.tarifId}
                onChange={(e) => ubahBaris(b.idBaris, { tarifId: e.target.value })}
                className="flex-1 rounded-sm border border-sand-100 bg-white px-3 py-2 text-sm"
              >
                {daftarTarif.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nama_layanan} · {formatRupiah(t.harga)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={b.qty}
                onChange={(e) => ubahBaris(b.idBaris, { qty: Math.max(1, Number(e.target.value)) })}
                className="w-20 rounded-sm border border-sand-100 bg-white px-2 py-2 text-center text-sm"
              />
              <span className="w-32 text-right text-sm text-ink/60">
                {formatRupiah((tarif?.harga ?? 0) * b.qty)}
              </span>
              <button
                type="button"
                onClick={() => hapusBaris(b.idBaris)}
                className="rounded-sm border border-sand-100 px-2.5 py-2 text-xs text-clay-700"
              >
                Hapus
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={tambahBaris}
        disabled={daftarTarif.length === 0}
        className="rounded-sm border border-teal-700/30 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-500/10"
      >
        + Tambah layanan
      </button>

      <div className="flex items-center justify-between border-t border-sand-100 pt-4">
        <p className="text-sm font-bold text-ink">Total</p>
        <p className="text-xl font-extrabold text-teal-700">{formatRupiah(total)}</p>
      </div>

      {state?.pesan && (
        <p role="alert" className="rounded-sm bg-clay-600/10 px-3.5 py-2.5 text-sm text-clay-700">
          {state.pesan}
        </p>
      )}

      <TombolBayar />
    </form>
  );
}
