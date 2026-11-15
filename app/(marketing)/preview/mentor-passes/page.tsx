import { notFound } from "next/navigation";
import { PassesPreview } from "./passes-preview";

export const metadata = { title: "Mentor passes preview - AlumniKonneQt", robots: { index: false } };

// Local design review only: fictional profiles, no account or database needed.
export default function MentorPassesPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PassesPreview />;
}
