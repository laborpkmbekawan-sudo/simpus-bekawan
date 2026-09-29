import { redirect } from "next/navigation";

// Landing modul Farmasi -> antrian resep (fitur yang paling sering dibuka).
export default function HalamanFarmasi() {
  redirect("/dashboard/farmasi/resep");
}
