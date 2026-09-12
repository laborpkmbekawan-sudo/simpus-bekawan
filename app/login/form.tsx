"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "./actions";

function TombolMasuk() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-sm bg-teal-700 px-4 py-3 text-sm font-bold text-white
                 transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Memeriksa akun..." : "Masuk"}
    </button>
  );
}

export default function FormLogin() {
  const [state, formAction] = useFormState(loginAction, null);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-ink">
          Email pegawai
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="nama@puskesmasbekawan.go.id"
          className="w-full rounded-sm border border-teal-700/20 bg-white px-3.5 py-2.5 text-sm
                     text-ink placeholder:text-ink/40 focus:border-teal-700"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="kata_sandi" className="text-sm font-medium text-ink">
          Kata sandi
        </label>
        <input
          id="kata_sandi"
          name="kata_sandi"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Masukkan kata sandi"
          className="w-full rounded-sm border border-teal-700/20 bg-white px-3.5 py-2.5 text-sm
                     text-ink placeholder:text-ink/40 focus:border-teal-700"
        />
      </div>

      {state?.pesan && (
        <p role="alert" className="rounded-sm bg-clay-600/10 px-3.5 py-2.5 text-sm text-clay-700">
          {state.pesan}
        </p>
      )}

      <TombolMasuk />

      <p className="text-center text-xs text-ink/50">
        Lupa kata sandi? Hubungi admin sistem di bagian tata usaha.
      </p>
    </form>
  );
}
