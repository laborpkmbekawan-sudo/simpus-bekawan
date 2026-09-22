"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const inputCls = "w-full rounded-sm border border-sand-100 bg-[#FBFDFF] px-3.5 py-2.5 text-sm";

export default function FormGantiPassword() {
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [status, setStatus] = useState<{ pesan: string; sukses: boolean } | null>(null);
  const [prosesJalan, setProsesJalan] = useState(false);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    if (password1.length < 6) {
      setStatus({ pesan: "Password minimal 6 karakter.", sukses: false });
      return;
    }
    if (password1 !== password2) {
      setStatus({ pesan: "Konfirmasi password tidak sama.", sukses: false });
      return;
    }

    setProsesJalan(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: password1 });
    setProsesJalan(false);

    if (error) {
      setStatus({ pesan: `Gagal ganti password: ${error.message}`, sukses: false });
      return;
    }

    setPassword1("");
    setPassword2("");
    setStatus({ pesan: "Password berhasil diganti.", sukses: true });
  }

  return (
    <form onSubmit={kirim} className="space-y-3">
      <div>
        <label htmlFor="password1" className="mb-1 block text-xs text-ink/50">
          Password baru
        </label>
        <input
          id="password1"
          type="password"
          value={password1}
          onChange={(e) => setPassword1(e.target.value)}
          className={inputCls}
          autoComplete="new-password"
        />
      </div>
      <div>
        <label htmlFor="password2" className="mb-1 block text-xs text-ink/50">
          Ulangi password baru
        </label>
        <input
          id="password2"
          type="password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          className={inputCls}
          autoComplete="new-password"
        />
      </div>

      {status?.pesan && (
        <p
          role="alert"
          className={`rounded-sm px-3.5 py-2.5 text-sm ${
            status.sukses ? "bg-teal-500/10 text-teal-700" : "bg-clay-600/10 text-clay-700"
          }`}
        >
          {status.pesan}
        </p>
      )}

      <button
        type="submit"
        disabled={prosesJalan}
        className="rounded-sm bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white
                   hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {prosesJalan ? "Menyimpan..." : "Ganti Password"}
      </button>
    </form>
  );
}
