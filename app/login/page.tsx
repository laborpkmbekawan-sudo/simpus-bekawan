import FormLogin from "./form";

export default function HalamanLogin({
  searchParams,
}: {
  searchParams: { alasan?: string };
}) {
  return (
    <main
      className="flex min-h-screen items-center justify-center p-7"
      style={{ background: "linear-gradient(135deg, #E9F8F6 0%, #F7FBFD 48%, #EAF1F8 100%)" }}
    >
      <div className="grid w-full max-w-[1080px] grid-cols-1 overflow-hidden rounded-card border border-sand-100 bg-white shadow-[0_24px_70px_rgba(13,41,66,0.12)] lg:grid-cols-[1.05fr_1fr]">
        {/* Panel identitas */}
        <section
          className="relative hidden flex-col justify-between overflow-hidden px-12 py-12 text-white lg:flex"
          style={{ background: "linear-gradient(145deg, #0D2942, #0F766E)" }}
        >
          <div
            className="pointer-events-none absolute -bottom-32 -right-36 h-72 w-72 rounded-full"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/25">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path d="M12 3v18M3 12h18" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-sm font-medium tracking-wide text-white/80">
              UPTD Puskesmas Bekawan
            </span>
          </div>

          <div className="max-w-md">
            <h1 className="text-[2.25rem] font-extrabold leading-[1.12] text-white">
              Satu sistem, seluruh
              <br />
              layanan puskesmas.
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-white/75">
              Pendaftaran, rekam medis, apotek, dan data pegawai tersimpan
              dalam satu tempat, dengan hak akses yang diatur per peran
              tugas.
            </p>
          </div>

          <p className="text-xs text-white/45">
            Akses terbatas untuk pegawai terdaftar. Aktivitas login tercatat.
          </p>
        </section>

        {/* Panel form */}
        <section className="flex items-center justify-center bg-white px-8 py-14 sm:px-12">
          <div className="w-full max-w-sm">
            <div className="mb-8 lg:hidden">
              <span className="text-sm font-medium text-teal-700">
                UPTD Puskesmas Bekawan
              </span>
            </div>

            <h2 className="text-[27px] font-extrabold text-ink">Masuk ke SIMPUS</h2>
            <p className="mt-1.5 text-sm text-ink/60">
              Gunakan akun yang didaftarkan oleh admin sistem.
            </p>

            {searchParams.alasan === "perlu-login" && (
              <p className="mt-4 rounded-sm bg-teal-700/8 px-3.5 py-2.5 text-sm text-teal-700">
                Sesi berakhir atau halaman perlu login. Silakan masuk kembali.
              </p>
            )}

            <div className="mt-7">
              <FormLogin />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
