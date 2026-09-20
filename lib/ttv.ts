// Ringkasan tanda vital satu baris, dipakai di daftar rujukan dan surat cetak.
export type NilaiTtv = {
  td_sistolik?: number | null;
  td_diastolik?: number | null;
  nadi?: number | null;
  frekuensi_napas?: number | null;
  suhu?: number | string | null;
  spo2?: number | null;
  gcs?: number | null;
  berat_badan?: number | string | null;
};

export function ringkasTtv(t: NilaiTtv): string {
  const td =
    t.td_sistolik != null && t.td_diastolik != null ? `TD ${t.td_sistolik}/${t.td_diastolik} mmHg` : null;
  return [
    td,
    t.nadi != null && `Nadi ${t.nadi} x/mnt`,
    t.frekuensi_napas != null && `RR ${t.frekuensi_napas} x/mnt`,
    t.suhu != null && `Suhu ${Number(t.suhu)} °C`,
    t.spo2 != null && `SpO2 ${t.spo2}%`,
    t.gcs != null && `GCS ${t.gcs}`,
    t.berat_badan != null && `BB ${Number(t.berat_badan)} kg`,
  ]
    .filter(Boolean)
    .join(" · ");
}
