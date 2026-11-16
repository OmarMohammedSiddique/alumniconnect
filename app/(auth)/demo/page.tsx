import { connection } from "next/server";
import { notFound } from "next/navigation";
import { demoSwitcherEnabled, isDemoPresenter } from "@/lib/demo-accounts";
import { PresenterKeyForm } from "./presenter-key-form";

export const metadata = { title: "Demo mode - AlumniKonneQt", robots: { index: false } };

export default async function DemoPage() {
  await connection();
  // Without the setting and a configured key, this page does not exist.
  if (!demoSwitcherEnabled()) notFound();
  return <PresenterKeyForm unlocked={await isDemoPresenter()} />;
}
