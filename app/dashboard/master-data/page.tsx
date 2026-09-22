import { createClient, getPegawaiSaya } from "@/lib/supabase/server";
import EditorTabel, { type Kolom } from "./editor-tabel";
import { simpanKlasterAction, simpanLokasiAction, simpanPosyanduAction } from "./actions";

const KOLOM_KLASTER: Kolom[] = [
  { key: "kode", label: "Kode" },
  { key: "nama", label: "Nama" },
  {
    key: "kelompok",
    label: "Kelompok",
    tipe: "select",
    opsi: [
      { value: "klaster", label: "Klaster" },
      { value: "lintas_klaster", label: "Lintas Klaster" },
    ],
  },
  { key: "kode_antrian", label: "Kode Antrian", lebarKecil: true },
  { key: "urutan", label: "Urutan", tipe: "number", lebarKecil: true },
];

const KOLOM_LOKASI: Kolom[] = [
  { key: "kode", label: "Kode" },
  { key: "nama", label: "Nama" },
  {
    key: "tipe",
    label: "Tipe",
    tipe: "select",
    opsi: [
      { value: "induk", label: "Induk" },
      { value: "pustu", label: "Pustu" },
    ],
  },
  { key: "urutan", label: "Urutan", tipe: "number", lebarKecil: true },
];

export default async function HalamanMasterData() {
  const pemanggil = await getPegawaiSaya();
  if (pemanggil?.peran !== "admin") {
    return (
      <div className="rounded-sm border border-clay-600/20 bg-clay-600/5 px-5 py-4 text-sm text-clay-700">
        Halaman ini khusus admin.
      </div>
    );
  }

  const supabase = createClient();
  const [{ data: klaster }, { data: lokasi }, { data: posyandu }] = await Promise.all([
    supabase.from("klaster").select("*").order("urutan", { ascending: true }),
    supabase.from("lokasi").select("*").order("urutan", { ascending: true }),
    supabase.from("posyandu").select("id, nama, lokasi_id, lokasi:lokasi_id (nama)").order("nama", { ascending: true }),
  ]);

  const daftarLokasi = lokasi ?? [];
  const kolomPosyandu: Kolom[] = [
    {
      key: "lokasi_id",
      label: "Lokasi",
      tipe: "select",
      opsi: daftarLokasi.map((l) => ({ value: l.id as string, label: l.nama as string })),
    },
    { key: "nama", label: "Nama Posyandu" },
  ];

  const dataPosyandu = (posyandu ?? []).map((p) => ({
    id: p.id,
    lokasi_id: p.lokasi_id,
    nama: p.nama,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Master Data</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Kelola daftar klaster layanan, lokasi kerja, dan posyandu. Data lama tidak bisa dihapus dari sini
          (biar gak bentrok dengan data yang sudah terhubung) — ubah nama/urutan saja.
        </p>
      </div>

      <EditorTabel
        judul="Klaster Layanan"
        keterangan="Struktur ILP puskesmas. Kode antrian kosong = klaster ini gak punya nomor antrian sendiri."
        kolom={KOLOM_KLASTER}
        data={klaster ?? []}
        aksi={simpanKlasterAction}
        kolomTambahan={{ kelompok: "klaster" }}
      />

      <EditorTabel
        judul="Lokasi Kerja"
        keterangan="Puskesmas Induk dan Pustu. Satu pegawai terhubung ke satu lokasi."
        kolom={KOLOM_LOKASI}
        data={daftarLokasi}
        aksi={simpanLokasiAction}
        kolomTambahan={{ tipe: "pustu" }}
      />

      <EditorTabel
        judul="Posyandu"
        keterangan="Posyandu di bawah tiap lokasi kerja."
        kolom={kolomPosyandu}
        data={dataPosyandu}
        aksi={simpanPosyanduAction}
        kolomTambahan={{ lokasi_id: daftarLokasi[0]?.id ?? "" }}
      />
    </div>
  );
}
