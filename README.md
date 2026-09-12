# SIMPUS - UPTD Puskesmas Bekawan

Tahap 1: login + data pegawai (hak akses). Stack: Next.js 14 (App Router) +
Supabase (Auth + Postgres + RLS) + Tailwind, deploy ke Vercel.

## 1. Setup Supabase

1. Buat project baru di https://supabase.com.
2. Buka **SQL Editor** > New query, tempel isi `supabase/schema.sql`, jalankan.
   Ini membuat tabel `pegawai`, enum hak akses, dan Row Level Security
   (aturan siapa boleh lihat/ubah data siapa).
3. Buka **Project Settings > API**, catat:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (rahasia, jangan bocor)

## 2. Buat admin pertama

RLS mengharuskan minimal satu admin ada duluan sebelum admin lain bisa
ditambah lewat aplikasi:

1. Dashboard Supabase > **Authentication > Users > Add user**, buat akun
   dengan email + password admin pertama.
2. Salin UUID user tersebut.
3. Jalankan di SQL Editor (ganti `<UUID_USER>` dan datanya):
   ```sql
   insert into public.pegawai (id, nama_lengkap, jabatan, unit_kerja, peran)
   values ('<UUID_USER>', 'Nama Admin', 'Kepala Tata Usaha', 'Manajemen', 'admin');
   ```
4. Sekarang bisa login di aplikasi dengan akun ini, dan tambah pegawai lain
   lewat halaman **Data Pegawai** (otomatis buat akun login + hak akses).

## 3. Jalankan lokal (VS Code)

```bash
npm install
cp .env.local.example .env.local   # isi 3 env di atas
npm run dev
```

Buka http://localhost:3000/login.

## 4. Push ke GitHub

```bash
git init
git add .
git commit -m "feat: login dan modul data pegawai"
git branch -M main
git remote add origin https://github.com/<username>/simpus-bekawan.git
git push -u origin main
```

## 5. Deploy ke Vercel

1. https://vercel.com > **Add New > Project**, pilih repo GitHub di atas.
2. Di **Environment Variables**, isi 3 variabel yang sama seperti
   `.env.local` (termasuk `SUPABASE_SERVICE_ROLE_KEY`).
3. Deploy. Setiap push ke `main` otomatis deploy ulang.

## Struktur hak akses

Peran (`peran_akses`) saat ini: `admin`, `dokter`, `perawat`, `bidan`,
`apoteker`, `loket`, `rekam_medis`. Tambah peran baru lewat migrasi SQL:

```sql
alter type public.peran_akses add value 'peran_baru';
```

Semua pengecekan hak akses dobel lapis: RLS di database (lapis utama,
tidak bisa dilewati walau lewat API langsung) + pengecekan di server
action (lapis kedua, buat pesan error yang jelas ke pengguna).

## Rencana modul berikutnya

- Pendaftaran pasien + antrian
- Rekam medis elektronik
- Apotek / stok obat
- Laporan (SPM, LB1, dst.)
