"use client";

export default function TombolCetak() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-sm bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 print:hidden"
    >
      Cetak Laporan
    </button>
  );
}
