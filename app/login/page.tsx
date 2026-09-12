import FormLogin from "./form";

export default function HalamanLogin({
  searchParams,
}: {
  searchParams: { alasan?: string };
}) {
  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      {/* Panel identitas -- bukan kartu putih ditengah layar, tapi blok
          warna penuh supaya SIMPUS terasa seperti layanan resmi, bukan
          produk SaaS generik. */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-teal-950 px-14 py-12 text-sand-50 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-sand-50/25">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <path d="M12 3v18M3 12h18" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-sm font-medium tracking-wide text-sand-50/80">
            UPTD Puskesmas Bekawan
          </span>
        </div>

        <div className="max-w-md">
          <h1 className="text-[2.75rem] font-semibold leading-[1.08] text-sand-50">
            Satu sistem, seluruh
            <br />
            layanan puskesmas.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-sand-50/70">
            Pendaftaran, rekam medis, apotek, dan data pegawai tersimpan
            dalam satu tempat, dengan hak akses yang diatur per peran
            tugas.
          </p>
        </div>

        <p className="text-xs text-sand-50/45">
          Akses terbatas untuk pegawai terdaftar. Aktivitas login tercatat.
        </p>
      </section>

      {/* Panel form */}
      <section className="flex items-center justify-center bg-sand-50 px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="text-sm font-medium text-teal-900">
              UPTD Puskesmas Bekawan
            </span>
          </div>

          <h2 className="text-2xl font-semibold text-ink">Masuk ke SIMPUS</h2>
          <p className="mt-1.5 text-sm text-ink/60">
            Gunakan akun yang didaftarkan oleh admin sistem.
          </p>

          {searchParams.alasan === "perlu-login" && (
            <p className="mt-4 rounded-sm bg-teal-900/8 px-3.5 py-2.5 text-sm text-teal-900">
              Sesi berakhir atau halaman perlu login. Silakan masuk kembali.
            </p>
          )}

          <div className="mt-7">
            <FormLogin />
          </div>
        </div>
      </section>
    </main>
  );
}
